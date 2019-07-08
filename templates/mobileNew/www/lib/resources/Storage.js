/**
 * @class Storage
 *
 * Manages persistent storage, via a key-value interface.
 *
 */
"use strict";

import analytics from "./Analytics.js";
import EventEmitter from "eventemitter2";
import CryptoJS from "crypto-js";
import Lock from "./Lock.js";
import Log from "./Log.js";
import PBKDF2async from "./PBKDF2-async.js";

var config = require("../config/config.js");

const disableEncryption = !config.platform.encryptedStorage; // false;

class Storage extends EventEmitter {
    constructor(name = "sdc", label = "SDC", version = "1.0", sizeInMB = 2) {
        super();
        this.secret = null; // passphrase
        this.key = null; // 256-bit key
        this.salt = null;

        this._queueLocks = {
            // a constant reference to available Synchronization Locks.
            /* key : Lock() */
        };

        try {
            // this.db is a webSQL implementation ()
            this.db = openDatabase(
                name,
                version,
                label,
                sizeInMB * 1024 * 1024
            );
            this.db.transaction((tx) => {
                tx.executeSql(
                    `
                    CREATE TABLE IF NOT EXISTS key_value_data 
                    (key PRIMARY KEY, value, is_encrypted)
                `,
                    [],
                    (/* tx, result */) => {},
                    (tx, err) => {
                        Log("DB error", err);
                        Log("tx:", tx);
                        analytics.logError(err);
                    }
                );
            });
        } catch (err) {
            Log(err);
            alert(
                "Error initializing the storage system:\n" +
                    (err.message || "") +
                    "\n" +
                    (err.stack || "")
            );
            analytics.logError(err);
        }
    }

    wait(time = 650) {
        return new Promise((ok) => {
            setTimeout(ok, time);
        });
    }

    setPassword(secret, resetSalt = false) {
        return new Promise((resolve, reject) => {
            var startTime = Date.now();
            this.secret = secret;

            Promise.resolve()
                .then(() => {
                    if (resetSalt) {
                        return null;
                    } else {
                        return this.get("__sdc_salt", {
                            resetAppOnFailure: false,
                            deserialize: false
                        });
                    }
                })
                .then((salt) => {
                    if (!salt) {
                        // Generate new salt
                        // (any old encrypted data will be lost)
                        this.salt = CryptoJS.lib.WordArray.random(16);
                        // Save the new salt
                        return this.set("__sdc_salt", this.salt.toString(), {
                            serialize: false,
                            forcePlainText: true
                        });
                    } else {
                        // Use existing salt
                        this.salt = CryptoJS.enc.Hex.parse(salt);
                        return null;
                    }
                })
                .then(() => {
                    // Allow any animations to start before beginning KDF
                    return this.wait(10);
                })
                .then(() => {
                    // Sync (may lock up UI)
                    //var fn = CryptoJS.PBKDF2;

                    // Async (crashes debugger)
                    var fn = PBKDF2async;

                    return fn(this.secret, this.salt, {
                        keySize: 256 / 32,
                        iterations: 10000,
                        iterationMode: "semi",
                        semiCount: 2000
                    });
                })
                .then((key) => {
                    this.key = key;

                    // If the KDF was too fast, wait some more
                    var endTime = Date.now();
                    var diff = endTime - startTime;
                    if (diff > 650) {
                        return null;
                    } else {
                        return this.wait(diff);
                    }
                })
                .then(() => {
                    resolve();
                })
                .catch((err) => {
                    Log("Password error", err);
                    analytics.logError(err);
                    reject(err);
                });
        });
    }

    /**
     * Encrypt a string with AES, using the key from `setPassword()`.
     *
     * @param {string} plaintext
     * @return {string}
     *      Ciphertext with embedded IV.
     */
    encrypt(plaintext) {
        var iv = CryptoJS.lib.WordArray.random(16);
        var ciphertext = CryptoJS.AES.encrypt(plaintext, this.key, { iv: iv });
        return ciphertext.toString() + ":::" + iv.toString();
    }

    /**
     * Decrypt a string with AES, using the key from `setPassword()`.
     *
     * @param {string} encoded
     *      An encoded string produced by `encrypt()`.
     * @return {string}
     */
    decrypt(encoded) {
        var parts = encoded.split(":::");
        var ciphertext = parts[0];
        var iv = CryptoJS.enc.Hex.parse(parts[1]);
        return CryptoJS.AES.decrypt(ciphertext, this.key, { iv: iv }).toString(
            CryptoJS.enc.Utf8
        );
    }

    /**
     * Test whether the secret given through `setPassword()` is valid.
     */
    testCrypto() {
        analytics.event("testing password");

        return new Promise((resolve, reject) => {
            if (!this.secret) reject();
            else {
                this.get("__sdc_password", {
                    resetAppOnFailure: false,
                    deserialize: false
                })
                    .then((value) => {
                        // Compare against previously set password
                        var hash = CryptoJS.SHA256(this.secret).toString();

                        if (value === null) {
                            // No previous password. Save hash now.
                            this.set("__sdc_password", hash, {
                                serialize: false
                            });
                            this.emit("ready");
                            resolve();
                        } else if (value == hash) {
                            this.emit("ready");
                            resolve();
                        } else {
                            reject();
                        }
                    })
                    .catch((err) => {
                        reject(err);
                    });
            }
        });
    }

    /**
     * Save something to persistent storage.
     *
     * @param {string} key
     *      Name of thing to save.
     * @param {string/object} value
     *      Value of thing to save.
     * @param {object} [options]
     * @param {boolean} [options.forcePlainText]
     *      Bypass encryption and save as plain text?
     *      Default false.
     * @param {boolean} [options.serialize]
     *      Serialize `value` with JSON.stringify().
     *      Default true.
     * @return {Promise}
     */
    set(key, value, options = {}) {
        var defaults = {
            forcePlainText: false,
            serialize: true
        };
        if (disableEncryption) {
            defaults.forcePlainText = true;
        }
        options = $.extend({}, defaults, options);

        var isEncrypted = 0;
        // Serialize
        if (options.serialize) {
            value = JSON.stringify(value);
        }
        // Encrypt
        if (!options.forcePlainText && this.secret) {
            value = this.encrypt(value);
            //value = CryptoJS.AES.encrypt(value, this.secret).toString();
            isEncrypted = 1;
        }

        return new Promise((resolve, reject) => {
            this.db.transaction((tx) => {
                tx.executeSql(
                    `
                    REPLACE INTO key_value_data (key, value, is_encrypted)
                    VALUES (?, ?, ?)
                `,
                    [key, value, isEncrypted],
                    (/*tx, result*/) => {
                        resolve();
                    },
                    (tx, err) => {
                        Log("DB error", err);
                        Log("tx:", tx);
                        reject(err);
                    }
                );
            });
        });
    }

    /**
     * Load something from persistent storage.
     *
     * @param {string} key
     *      Name of thing to load.
     * @param {object} [options]
     * @param {boolean} [resetAppOnFailure]
     *      Reload the app on failure to decrypt?
     *      Default true.
     * @param {boolean} [deserialize]
     *      Deserialize loaded value with JSON.parse().
     *      Default true.
     * @return {Promise}
     */
    get(key, options = {}) {
        var defaults = {
            resetAppOnFailure: true,
            deserialize: true
        };
        if (disableEncryption) {
            defaults.resetAppOnFailure = false;
        }
        options = $.extend({}, defaults, options);

        return new Promise((resolve, reject) => {
            this.db.readTransaction((tx) => {
                tx.executeSql(
                    `
                    SELECT value, is_encrypted
                    FROM key_value_data
                    WHERE key = ?
                `,
                    [key],
                    (tx, results) => {
                        if (results.rows.length < 1) {
                            // Not found
                            resolve(null);
                        } else {
                            var row = results.rows.item(0);
                            var value = row.value;

                            // Decrypt
                            if (row.is_encrypted && this.secret) {
                                try {
                                    value = this.decrypt(value);
                                    //value = CryptoJS.AES.decrypt(value, this.secret).toString(CryptoJS.enc.Utf8);
                                } catch (err) {
                                    // Unable to decrypt
                                    if (options.resetAppOnFailure) {
                                        document.location.reload();
                                    } else {
                                        Log("Incorrect password");
                                        reject(new Error("Incorrect password"));
                                    }
                                    return;
                                }
                            } else if (row.is_encrypted) {
                                //alert('Password is required');
                                if (options.resetAppOnFailure) {
                                    document.location.reload();
                                } else {
                                    Log("Missing password");
                                    reject(new Error("Missing password"));
                                }
                                return;
                            }

                            // Deserialize
                            if (options.deserialize) {
                                try {
                                    value = JSON.parse(value);
                                } catch (err) {
                                    Log("Bad saved data?", key, value);
                                    value = null;
                                }
                            }

                            resolve(value);
                        }
                    },
                    (tx, err) => {
                        Log("DB error", err);
                        analytics.logError(err);
                        reject(err);
                    }
                );
            });
        });
    }

    clear(key) {
        return new Promise((resolve, reject) => {
            this.db.transaction((tx) => {
                tx.executeSql(
                    `
                    DELETE FROM key_value_data
                    WHERE key = ?
                `,
                    [key],
                    (/* tx, results */) => {
                        resolve();
                    },
                    (tx, err) => {
                        Log("DB error", err);
                        Log("tx:", tx);
                        analytics.logError(err);
                        reject();
                    }
                );
            });
        });
    }

    clearAll() {
        return new Promise((resolve, reject) => {
            this.db.transaction((tx) => {
                tx.executeSql(
                    `
                    DELETE FROM key_value_data
                `,
                    [],
                    (/* tx, results */) => {
                        resolve();
                    },
                    (tx, err) => {
                        Log("DB error", err);
                        Log("tx:", tx);
                        analytics.logError(err);
                        reject(err);
                    }
                );
            });
        });
    }

    /**
     * Lock
     * expose an Async Lock for a given Key.  This is designed to
     * help ModelLocal objects synchronize data access.
     * @param {string} key  a unique key (probably the ABObject.name)
     * @return {Lock}
     */
    Lock(key) {
        if (!this._queueLocks[key]) {
            this._queueLocks[key] = new Lock();
        }
        return this._queueLocks[key];
    }
}

var storage = new Storage();
export { storage, Storage };

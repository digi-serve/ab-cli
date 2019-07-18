/*
 * NetworkRelay.js
 * An implementation of our Netork object that sends it's data across our
 * encrypted relay server.
 */
import account from "./Account.js";
import analytics from "./Analytics.js";
import CryptoJS from "crypto-js";
import JSEncrypt from "./jsencrypt.js";
import Lock from "./Lock.js";
import Log from "./Log";
import NetworkRest from "./NetworkRest";
import { storage } from "./Storage.js";

var config = require("../config/config.js");

class NetworkRelay extends NetworkRest {
    /**
     * Generate random bytes in hex format.
     *
     * @param {integer} [numBytes]
     *      32 bytes for AES 256 key (default).
     *      16 bytes for IV.
     *
     * @return {string}
     */
    static randomBytes(numBytes = 32) {
        // browser WebCrypto for secure random number generator
        var numbers = new Uint8Array(numBytes);
        // Note: window.crypto != CryptoJS
        window.crypto.getRandomValues(numbers); // 0 to 255

        // convert numbers to hex string
        var hexString = "";
        numbers.forEach((num) => {
            var h = num.toString(16); // '0' to 'ff'
            if (h.length == 1) {
                hexString += "0" + h; // left pad with '0' if needed
            } else {
                hexString += h;
            }
        });

        return hexString;
    }

    constructor() {
        super();

        this.rsa = new JSEncrypt.JSEncrypt();
        this.rsaPublicKey = null;
        this.aesKey = null;
        this.relayState = null;

        this.appUUID = null;

        this.tokenLock = new Lock();
        this.jobTokens = null;
        this.jobPackets = null;

        this.isPolling = false;
        this.pollFrequency = config.appbuilder.relayPollFrequencyNormal;
        this.poll();

        this.isListening = false;
    }

    /**
     * Start listening for network changes
     */
    startListening() {
        if (!this.isListening) {
            // make sure we are listening to Network Changes
            // when the network goes 'online' attempt to flush any queued requests.
            document.addEventListener(
                "online",
                () => {
                    Log("NetorkRelay: network has come online.");

                    // make sure we are properly initialized
                    // NOTE: should not be a problem to call even after we have
                    // .init() before.
                    this.init()
                        .then(() => {
                            // now flush our pending requests
                            return this.queueFlush();
                        })
                        .then(() => {
                            // trigger an 'online' event
                            this.emit("online");
                        });
                },
                false
            );

            // when the network goes 'offline'
            document.addEventListener(
                "offline",
                () => {
                    Log("NetworkRelay: network has gone offline.");

                    // trigger an 'online' event
                    this.emit("offline");
                },
                false
            );

            this.isListening = true;
        }
    }

    init() {
        this.startListening();
        Log("NetworkRelay: init()");

        //
        // make sure our Relay system is properly configured: authToken, aesKey, etc...
        var init = super.init({
            baseURL: config.appbuilder.urlRelayServer
        });

        return new Promise((resolve, reject) => {
            //// Pull out our stored values:
            // AES key,  SyncStatus

            var readAESKey = storage.get("aesKey").then((value) => {
                this.aesKey = value || null;
            });

            var readSyncStatus = storage.get("relayState").then((value) => {
                this.relayState = value || {
                    aesKeySent: false,
                    lastSyncDate: null
                };
            });

            var readAppUUID = storage.get("appUUID").then((value) => {
                this.appUUID = value || null;
            });

            // FYI:
            // we need both a authToken and an AES key to communicate to the Relay
            // server.

            Promise.all([init, readAESKey, readSyncStatus, readAppUUID])

                // setup our unique appUUID:
                .then(() => {
                    if (!this.appUUID) {
                        this.appUUID = this.uuid();
                        return storage.set("appUUID", this.appUUID);
                    }
                })

                // associate appUUID with analytics
                .then(() => {
                    analytics.info({
                        id: this.appUUID
                    });
                })

                // skip this process if we are offline:
                .then(() => {
                    Log("NetworkRelay: init stage 2");
                    if (!this.isNetworkConnected()) {
                        Log("NetworkRelay: network is offline");
                        var offlineError = new Error(
                            "NetworkRelay:init(): Skipping init() -> network is off line."
                        );
                        offlineError.code = "E_OFFLINE";
                        throw offlineError;
                    }
                })

                // if no authToken, then we can exit because we probaly haven't had a QR code yet.
                .then(() => {
                    Log("NetworkRelay: init stage 3");
                    if (!account.authToken) {
                        Log("NetworkRelay: no credentials found");
                        var skipError = new Error(
                            "I want to skip the next step."
                        );
                        skipError.code = "E_SKIP";
                        throw skipError;
                    }
                })

                // have we done our initial /mobile/init and gotten an RSA key?
                .then(() => {
                    Log("NetworkRelay: init stage 4");
                    return this.initRSA();
                })

                // if no AES key (but we have a authToken), we can generate the AES key,
                .then(() => {
                    Log("NetworkRelay: init stage 5");
                    if (this.aesKey == null) {
                        // Generate AES key now.
                        this.aesKey = NetworkRelay.randomBytes(32);
                        return storage.set("aesKey", this.aesKey);
                    }
                })

                // if we haven't sent the AES key then we need to send it.
                .then(() => {
                    Log("NetworkRelay: init stage 7");
                    if (!this.relayState.aesKeySent) {
                        // - MF contacts PublicServer.mobile/initresolve  { rsa_aes, userUUID, AppID, AppUUID }

                        var aesObj = {
                            aesKey: this.aesKey
                        };
                        var plaintext = JSON.stringify(aesObj);
                        var encrypted = this.rsa.encrypt(plaintext);

                        return storage.get("uuid").then((uuid) => {
                            // prevent offline attempt.
                            if (!this.isNetworkConnected()) {
                                var error = new Error(
                                    "NetworkRelay:init(): prevent initresolve when no network conencted."
                                );
                                analytics.logError(error);
                                return;
                            }

                            var data = {
                                rsa_aes: encrypted,
                                userUUID: uuid,
                                appID: config.appbuilder.maID,
                                appUUID: this.appUUID
                            };

                            // NOTE: use super.post() here so we don't do our .post()
                            // which encrypts the data with AES ...
                            return super
                                .post({
                                    url:
                                        config.appbuilder.routes
                                            .mobileInitResolve,
                                    data: data
                                })
                                .then(() => {
                                    this.relayState.aesKeySent = true;
                                    return storage.set(
                                        "relayState",
                                        this.relayState
                                    );
                                });
                        });
                    }
                })

                // at this point, we should be ready to go.
                .then(() => {
                    Log("NetworkRelay: init complete");
                    resolve();
                })
                .catch((err) => {
                    // if this was a simple skip attempt:
                    if (err.code == "E_SKIP") {
                        Log("init was skipped");
                        // actually, everything is just fine.
                        resolve();
                    } else {
                        Log.error("init failed", err);
                        analytics.logError(err);
                        reject(err);
                    }
                });
        });
    }

    /**
     * Fetch the user's RSA public key from the server.
     * @return {Promise}
     *    Resolves with the RSA public key string
     */
    initRSA() {
        return new Promise((resolve, reject) => {
            Log("begin initRSA()");

            storage
                .get("rsaPublicKey")
                .then((value) => {
                    Log(
                        "..stored RSA public key length: ",
                        String(value).length
                    );
                    if (value && String(value).length > 50) {
                        return value;
                    } else {
                        Log("..fetching RSA public key from server");
                        return super
                            .get({
                                url: config.appbuilder.routes.mobileInit, // "/mobile/init",
                                data: {
                                    appID: config.appbuilder.maID
                                }
                            })
                            .then((data) => {
                                Log("..got server response");
                                // data should be:
                                // {
                                //  userUUID:'<string>',
                                //  rsaPublic:'<string>',
                                //  appPolicy:{ obj }
                                // }

                                // go ahead and save these values:
                                return Promise.all([
                                    storage.set("uuid", data.userUUID),
                                    storage.set("rsaPublicKey", data.rsaPublic),
                                    storage.set("appPolicy", data.appPolicy)
                                ]).then(() => {
                                    Log("..saved server response");
                                    return data.rsaPublic;
                                });
                            });
                    }
                })
                .then((rsaKey) => {
                    Log("... pre .rsa config");
                    // now configure our RSA library with our public key
                    this.rsaPublicKey = rsaKey;
                    this.rsa.setKey(this.rsaPublicKey);

                    Log("initRSA() done");
                    resolve(rsaKey);
                })
                .catch((err) => {
                    Log("initRSA error", err.message || err);

                    analytics.logError(err);
                    Log.error("::: 2) error trying to get rsa key:", err);
                    reject(err);
                });
        });
    }

    /**
     * encrypt
     * return an AES encrypted blob of the stringified representation of the given
     * data.
     * @param {obj} data
     * @return {string}
     */
    encrypt(data) {
        var encoded = "";

        if (data) {
            var plaintext = JSON.stringify(data);

            var iv = NetworkRelay.randomBytes(16);
            var ciphertext = CryptoJS.AES.encrypt(
                plaintext,
                CryptoJS.enc.Hex.parse(this.aesKey),
                { iv: CryptoJS.enc.Hex.parse(iv) }
            );

            // <base64 encoded cipher text>:::<hex encoded IV>
            encoded = ciphertext.toString() + ":::" + iv;
        }

        return encoded;
    }

    /**
     * decrypt
     * return a javascript obj that represents the data that was encrypted
     * using our AES key.
     * @param {string} data
     * @return {obj}
     */
    decrypt(data) {
        var finalData = null;

        if (typeof data == "string" && data.match(":::")) {
            var dataParts = data.split(":::");
            var ciphertext = dataParts[0];
            var iv = dataParts[1];
            var plaintext;
            // Decrypt AES
            try {
                var decrypted = CryptoJS.AES.decrypt(
                    ciphertext,
                    CryptoJS.enc.Hex.parse(this.aesKey),
                    { iv: CryptoJS.enc.Hex.parse(iv) }
                );
                plaintext = decrypted.toString(CryptoJS.enc.Utf8);
            } catch (err) {
                Log.error("Error decrypting incoming relay data", data, err);
                analytics.logError(err);

                plaintext = data;
            }
            // Parse JSON
            try {
                finalData = JSON.parse(plaintext);
            } catch (err) {
                analytics.log(
                    "ABRelay.decrypt(): error trying to JSON.parse() the returned data."
                );
                analytics.logError(err);
                finalData = plaintext;
            }
        }

        return finalData;
    }

    /**
     * NetworkRelay.poll()
     * initiate a poll to the Public Relay Server to see if there are any
     * responses for us:
     */
    poll() {
        // only start the polling loop 1x:
        if (!this.isPolling) {
            this.isPolling = true;

            var checkIn = () => {
                // if we are ready to talk to MCC:
                if (
                    this.relayState &&
                    this.relayState.aesKeySent &&
                    this.isNetworkConnected()
                ) {
                    super
                        .get({
                            url: config.appbuilder.routes.relayRequest, // "/mobile/relayrequest",
                            data: { appUUID: this.appUUID }
                        })
                        .then((responses) => {
                            return responses || [];
                        })
                        .then((responses) => {
                            var all = [];
                            responses.forEach((r) => {
                                all.push(this.processResponse(r));
                            });
                            return Promise.all(all);
                        })
                        .then(() => {
                            var anyLeft = false;
                            /* eslint-disable-next-line no-unused-vars */
                            for (var jt in this.jobTokens) {
                                anyLeft = true;
                            }

                            // if there are no jobTokens left reset our polling Frequency to normal
                            if (!anyLeft) {
                                this.pollFrequency =
                                    config.appbuilder.relayPollFrequencyNormal;
                            }
                        })
                        .then(() => {
                            this.pollTimerID = setTimeout(
                                checkIn,
                                this.pollFrequency
                            );
                        })
                        .catch((err) => {
                            analytics.log(
                                "Relay.poll().checkin(): an error was returned:"
                            );
                            analytics.logError(err);
                            // console.error('Relay.poll().checkin(): an error was returned:', err);
                            this.pollTimerID = setTimeout(
                                checkIn,
                                this.pollFrequency
                            );
                        });
                } else {
                    // else try again later:
                    this.pollTimerID = setTimeout(checkIn, this.pollFrequency);
                }
            };
            checkIn();
        }
    }

    /**
     * processResponse()
     * take a given response packet back from the server and ...
     * you know ... process it.
     *
     * The big consideration here is that some packets can be excessivly
     * large (think encrypted images) and need to be split into smaller
     * packets that need to be reassembled.  We reasseble these packets
     * before passing them off to .resolveJob()
     * @param {obj} response  the packet received from the Public Relay Server
     *              format: {
     *                  totalPackets: {int} >= 1,
     *                  jobToken: {string},  the local jobToken this packet
     *                                  is a responce to.
     *                  data: {string}  the encrypted data
     *                  appUUID: {string}
     *                  packet: {int}  0 ->  totalPackets-1
     *              }
     * @response {Promise}
     */
    processResponse(response) {
        if (response.totalPackets == 1) {
            return this.resolveJob(response);
        } else {
            // add this response to our pending Job Packets

            return Promise.resolve()
                .then(() => {
                    return this.getJobPackets();
                })
                .then(() => {
                    this.jobPackets[response.jobToken] =
                        this.jobPackets[response.jobToken] || [];
                    var packets = this.jobPackets[response.jobToken];
                    packets.push(response);

                    // now if we have a complete set, combine and resolve:
                    if (packets.length == response.totalPackets) {
                        // not sure what order packets are in so hash them:
                        var hash = {};
                        packets.forEach((p) => {
                            hash[p.packet] = p;
                        });

                        // then pull off 0 -> packets.length
                        var encryptedData = "";
                        for (var i = 0; i < response.totalPackets; i++) {
                            encryptedData += hash[i].data;
                        }

                        var compiledResponse = {
                            appUUID: response.appUUID,
                            data: encryptedData,
                            jobToken: response.jobToken
                        };

                        // we can remove these pending job packets now
                        delete this.jobPackets[response.jobToken];

                        return this.resolveJob(compiledResponse);
                    }
                })
                .then(() => {
                    this.saveJobPackets();
                });
        }
    }

    /**
     * resolveJob()
     * take the response from the Public Relay Server, and publish it to
     * the jobResponse that was requested for it.
     * @param {obj} response  the response packet from the server:
     *              {
     *                  appUUID: {string},
     *                  data: {string},  encrypted data
     *                  jobToken: {string}
     *              }
     * @response {Promise}
     */
    resolveJob(response) {
        var data = null;
        var error = null;
        return (
            Promise.resolve()

                // decrypt the data
                .then(() => {
                    data = this.decrypt(response.data);

                    // we expect a fully wrapped data packet back:
                    // {
                    //  status: "success",
                    //  data:[]
                    // }

                    // remember if this is an error
                    if (data.status == "error") {
                        error = data;
                    }

                    // but we only want to return the .data portion:
                    if (data.data) {
                        data = data.data;
                    }
                })

                .then(() => {
                    return this.tokenLock.acquire();
                })

                // find the jobToken
                // trigger the registered .key callback
                .then(() => {
                    return this.getTokens();
                })
                .then((tokens) => {
                    var foundToken = this.jobTokens[response.jobToken];
                    if (foundToken) {
                        // indicate an error if one was passed back:
                        if (error) {
                            foundToken.context.error = error;
                        }
                        this.publishResponse(foundToken, data);
                        // this.emit(foundToken.key, foundToken.context, data);
                        return foundToken;
                    } else {
                        Log.error(
                            "!!! Unknown job token in response packet:",
                            response.jobToken,
                            tokens,
                            data
                        );
                        return null;
                    }
                })
                // remove the jobToken & save()
                .then((foundToken) => {
                    // if a token was processed in previous step
                    if (foundToken) {
                        delete this.jobTokens[response.jobToken];
                        return this.saveTokens();
                    }
                })
                .then(() => {
                    return this.tokenLock.release();
                })
                .then(() => {
                    this.emit("job.done", "done");
                })
        );
    }

    /**
     * Reset credentials to a blank state.
     *
     * @return {Promise}
     */
    reset() {
        return Promise.all([
            storage.set("aesKey", null),
            storage.set("rsaPublicKey", null),
            storage.set("relayState", {
                aesKeySent: false,
                lastSyncDate: null
            }),
            storage.set("appUUID", null)
        ]);
    }

    /**
     * getTokens()
     * return the current copy of the jobTokens.
     * if we have to pull the data from storage, this will return a Promise
     * else the current jobTokens object is returned.
     */
    getTokens() {
        if (!this.jobTokens) {
            return storage.get("abRelayJobToken").then((value) => {
                this.jobTokens = this.jobTokens || value || {};
                return this.jobTokens;
            });
        } else {
            return this.jobTokens;
        }
    }

    /**
     * saveTokens()
     * save a copy of our jobTokens to storage.
     * @return {Promise}
     */
    saveTokens() {
        // save this back to our storage:
        return storage.set("abRelayJobToken", this.jobTokens);
    }

    /**
     * getJobPackets()
     */
    getJobPackets() {
        if (!this.jobPackets) {
            return storage.get("abRelayJobPackets").then((value) => {
                //// NOTE: it is possible that while we were waiting for storage.get()
                //// several more calls to getJobPackets() were fired off.  any processing
                //// or alterations to jobPackets inbetween these times would be overwritten
                //// by these new values, so make sure jobPackets are included in this chain:

                this.jobPackets = this.jobPackets || value || {};
                return this.jobPackets;
            });
        } else {
            return this.jobPackets;
        }
    }

    /**
     * saveJobPackets()
     */
    saveJobPackets() {
        // save this back to our storage:
        return storage.set("abRelayJobPackets", this.jobPackets);
    }

    ///
    /// API
    ///

    /**
     * NetworkRelay.get()
     * perform an AJAX GET request through the Relay Server
     * @param {obj} params the request parameters that need to be executed on
     *                     the Core Server
     * @param {obj} jobResponse the callback info for handling the response.
     *              {
     *                  key:'unique.key',
     *                  context:{ obj data }
     *              }
     * @return {Promise}
     */
    get(params, jobResponse) {
        params.type = params.type || "GET";
        return this._createJob(params, jobResponse);
    }

    /**
     * NetworkRelay.post()
     * perform an AJAX POST request through the Relay Server
     * @param {obj} params the request parameters that need to be executed on
     *                     the Core Server
     * @param {obj} jobResponse the callback info for handling the response.
     *              {
     *                  key:'unique.key',
     *                  context:{ obj data }
     *              }
     * @return {Promise}
     */
    post(params, jobResponse) {
        params.type = params.type || "POST";
        return this._createJob(params, jobResponse);
    }

    /**
     * NetworkRelay.put()
     * perform an AJAX PUT request through the Relay Server
     * @param {obj} params the request parameters that need to be executed on
     *                     the Core Server
     * @param {obj} jobResponse the callback info for handling the response.
     *              {
     *                  key:'unique.key',
     *                  context:{ obj data }
     *              }
     * @return {Promise}
     */
    put(params, jobResponse) {
        params.type = params.type || "PUT";
        return this._createJob(params, jobResponse);
    }

    /**
     * NetworkRelay.delete()
     * perform an AJAX DELETE request through the Relay Server
     * @param {obj} params the request parameters that need to be executed on
     *                     the Core Server
     * @param {obj} jobResponse the callback info for handling the response.
     *              {
     *                  key:'unique.key',
     *                  context:{ obj data }
     *              }
     * @return {Promise}
     */
    delete(params, jobResponse) {
        params.type = params.type || "DELETE";
        return this._createJob(params, jobResponse);
    }

    /**
     * _createJob
     * All our Relay requests simply create jobs on the Relay server to
     * complete. This fn() packages our jobs and creates them on the Relay
     * Server.
     * @param {obj} params the request parameters that need to be executed on
     *              the Core Server
     * @param {obj} jobResponse the callback info for handling the response.
     *              {
     *                  key:'unique.key',
     *                  context:{ obj data }
     *              }
     * @return {Promise}
     */
    _createJob(params, jobResponse) {
        if (!this.account || !this.account.authToken) {
            analytics.log("ABRelay._createJob(): request without credentials!");
            return Promise.resolve();
        }

        // ok, the given params, are the DATA we want to send to the RelayServer
        var eParams = this.encrypt(params);
        var jobToken = this.uuid();

        var relayParams = {
            url: config.appbuilder.routes.relayRequest,
            data: {
                appUUID: this.appUUID,
                data: eParams,
                jobToken: jobToken
            }
        };

        // we are Creating a new relay entry, so we do a POST
        return super
            .post(relayParams)
            .catch((err) => {
                analytics.log(
                    "NetworkRelay." +
                        params.type +
                        "(): error communicating with RelayServer"
                );
                analytics.logError(err);

                // throw err again to pass it back to calling routine:
                throw err;
            })
            .then(() => {
                return this.tokenLock.acquire();
            })
            .then(() => {
                return this.getTokens();
            })
            .then((tokens) => {
                // add our jobToken to the local data:
                tokens[jobToken] = jobResponse;
                return tokens;
            })
            .then((/* tokens */) => {
                // save this back to our storage:
                return this.saveTokens();
            })
            .then(() => {
                return this.tokenLock.release();
            })
            .then(() => {
                this.emit("job.added", "added");
            });
    }

    /**
     * _resend()
     * processes messages that were queued due to network connectivity
     * issues.  Our initial run would have already converted the params to
     * the encrypted packet and made our jobToken.  So we just try to send
     * it again now.
     * @param {obj} params  the jQuery.ajax() formatted params
     * @return {Promise}
     */
    _resend(params /*, jobResponse */) {
        return super.post(params).catch((err) => {
            analytics.log(
                "NetworkRelay._resend(): error communicating with RelayServer"
            );
            analytics.logError(err);

            // throw err again to pass it back to calling routine:
            throw err;
        });
    }
}

export default NetworkRelay;

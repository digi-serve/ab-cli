/**
 * @class Account
 *
 * Manages the user's account credentials on the device
 *
 * Exports a singleton instance.
 */
"use strict";

import analytics from "./Analytics.js";
import EventEmitter from "eventemitter2";
import Log from "./Log.js";
import Network from "./Network";
import { storage } from "./Storage.js";
import updater from "./Updater.js";

var config = require("../config/config.js");

class Account extends EventEmitter {
    constructor() {
        super();

        this.f7app = null;
        this.authToken = null;

        this.importInProgress = false;

        this.username = "??";

        this.relayReady = null;
        // {Deferred} : used to track a pending call to load the
        // site user data ( .initUserData() )
    }

    /**
     * @param {object} options
     * @param {Framework7} options.app
     *
     * @return {Promise}
     */
    init(options = {}) {
        this.f7app = options.app;
        return new Promise((resolve) => {
            storage
                .get("authToken")
                .then((value) => {
                    this.authToken = value;
                    console.log("account credentials ready");
                    return storage.get("siteUserData");
                })
                .then((siteUserData) => {
                    if (siteUserData) {
                        this.username = siteUserData.user.username;
                    }
                    resolve();
                });
        });
    }

    initUserData() {
        return new Promise((resolve /*, reject */) => {
            // @TODO: implement reject() case
            if (this.username != "??") {
                resolve();
            } else {
                // 1st time through, we create the deferred, and
                // make the network call to store the data.
                if (!this.relayReady) {
                    this.relayReady = $.Deferred();

                    // create a callback for our network job response:
                    var responseContext = {
                        key: "platform.account.username",
                        context: {}
                    };
                    Network.on(responseContext.key, (context, data) => {
                        storage.set("siteUserData", data).then(() => {
                            this.username = data.user.username;
                            this.relayReady.resolve();
                        });
                    });

                    // Call the url
                    Network.get(
                        { url: config.appbuilder.routes.userData },
                        responseContext
                    );
                }

                // every time through, we make sure the returned promise
                // gets resolved() when our relayReady is resolved.
                this.relayReady.then(() => {
                    resolve();
                });
            }
        });
    }

    /**
     * Reset credentials and set a new auth token.
     * Used by importSettings(), and also by appPage when migrating from the
     * fake app during first use.
     *
     * @param {string} authToken
     * @return {Promise}
     */
    setAuthToken(authToken) {
        analytics.event("importSettings(): reset credentials");
        Log("::: importSettings(): reset credentials");
        return Network.reset().then(() => {
            Log("::: importSettings(): saved new credentials");
            this.authToken = authToken;
            return storage.set("authToken", this.authToken);
        });
    }

    /**
     * Import credentials and/or CodePush deployment keys.
     *
     * @param {object/string} data
     *      The QR code JSON data. The format is somewhat constrained by
     *      backwards compatibility with the fake contacts app.
     *      {
     *          "userInfo": {
     *              "auth_token": <string>
     *              "updateKeys": {
     *                  "ios": <string>,
     *                  "android": <string>
     *              }
     *          }
     *      }
     *
     */
    importSettings(data) {
        if (this.importInProgress) {
            Log("::: importSettings(): already in progress");
            return;
        }
        this.importInProgress = true;

        if (typeof data != "object") {
            try {
                data = JSON.parse(data);
            } catch (err) {
                data = {};
            }
        }

        if (data && data.userInfo) {
            // This is the loading progress modal dialog box

            //// TODO:
            //// figure out proper process for reseting the Account during an import
            //// --> This works, but is this the right place?
            this.relayReady = null;

            var loader = this.f7app.dialog.progress(
                "<t>Connecting your account</t>"
            );

            Log("::: QRInitBegin :::");

            // Should be possible to have a QR code with only auth_token,
            // only updateKeys, or both.
            var authTokenReady = $.Deferred();
            var codePushReady = $.Deferred();

            var shouldRestart = false;
            var shouldImportAuthToken = true;

            // What has been imported?
            var importState = {
                authToken: false,
                deploymentKeys: false
            };

            // Part A: Import authToken
            if (data.userInfo.auth_token) {
                var authToken = data.userInfo.auth_token;
                var currentAuthToken = this.authToken;

                Promise.resolve()
                    .then(() => {
                        if (!currentAuthToken) {
                            // No existing authToken. Import immediately.
                            shouldImportAuthToken = true;
                            return null;
                        } else if (currentAuthToken == authToken) {
                            // authToken remains unchanged.
                            Log(
                                "::: importSettings(): credentials unchanged"
                            );
                            shouldImportAuthToken = false;
                            return null;
                        } else {
                            // Confirm switching to new authToken.
                            return new Promise((ok) => {
                                // Close the progress dialog box temporarily

                                loader.$el.remove();
                                loader.close();
                                loader.destroy();

                                this.f7app.dialog.confirm(
                                    "<t>This will reset the data on this device</t>",
                                    "<t>Do you want to continue?</t>",
                                    () => {
                                        // [ok]
                                        shouldImportAuthToken = true;
                                        ok();
                                    },
                                    () => {
                                        // [cancel]
                                        shouldImportAuthToken = false;
                                        ok();
                                    }
                                );
                            });
                        }
                    })
                    .then(() => {
                        // Re-open the progress dialog box
                        // loader.open();

                        // #Hack! : for some reason framework7 .close() .destroy()
                        // on a progress modal doesn't remove the modal (just makes
                        // it invisible, but it will intefere with clicking on the
                        // screen). So we manually remove it here:
                        loader.$el.remove();
                        loader.close();
                        loader = this.f7app.dialog.progress(
                            "<t>Connecting your account</t>"
                        );
                        if (shouldImportAuthToken) {
                            return this.setAuthToken(authToken).then(() => {
                                importState.authToken = true;
                            });
                        }
                    })
                    .then(() => {
                        authTokenReady.resolve();
                    })
                    .catch((err) => {
                        this.emit("QRInitError", {
                            message: "Error importing data",
                            error: err
                        });
                        Log.error(
                            "Error while importing credentials from QR code"
                        );
                        Log(err);
                        authTokenReady.reject(err);
                    });
            } else {
                authTokenReady.resolve();
            }

            // Part B: Import CodePush deployment keys
            if (data.userInfo.updateKeys) {
                var keys = data.userInfo.updateKeys;
                if (typeof keys == "object") {
                    var clearListeners = () => {
                        for (var eventKey in listeners) {
                            updater.removeListener(
                                eventKey,
                                listeners[eventKey]
                            );
                        }
                    };

                    var listeners = {
                        upToDate: () => {
                            Log(
                                "::: importSettings(): code up to date"
                            );
                            importState.deploymentKeys = true;
                            clearListeners();
                            codePushReady.resolve();
                        },
                        installed: () => {
                            Log(
                                "::: importSettings(): new code installed"
                            );
                            shouldRestart = true;
                            importState.deploymentKeys = true;
                            clearListeners();
                            codePushReady.resolve();
                        },
                        error: () => {
                            Log(
                                "::: importSettings(): error syncing code"
                            );
                            clearListeners();
                            this.emit("QRInitError", {
                                message: "Error Updating code"
                            });
                            codePushReady.reject(
                                new Error("CodePush sync error")
                            );
                        }
                    };

                    for (var eventKey in listeners) {
                        updater.once(eventKey, listeners[eventKey]);
                    }

                    // Sync with CodePush, but don't restart yet
                    updater.sync(keys, { preventRestart: true });
                }
            } else {
                codePushReady.resolve();
            }

            Promise.all([authTokenReady, codePushReady])
                .then(() => {
                    this.importInProgress = false;
                    Log("::: importSettings(): all done!");

                    loader.$el.remove();
                    loader.close();
                    loader.destroy();

                    if (shouldRestart) {
                        updater.restart();
                    } else {
                        this.emit("imported", importState);
                    }
                })
                .catch((err) => {
                    this.importInProgress = false;
                    Log("::: importSettings(): error");
                    Log(err.message || err);
                    analytics.logError(err);
                    this.emit("importError", err);

                    loader.$el.remove();
                    loader.close();
                    loader.destroy();

                    this.f7app.dialog.alert(
                        err.message || err,
                        "<t>Error connecting account</t>"
                    );
                });
        } else {
            // No userInfo object
            analytics.log("::: importSettings(): unknown data format");
            this.importInProgress = false;
        }
    }
}

var account = new Account();
export default account;

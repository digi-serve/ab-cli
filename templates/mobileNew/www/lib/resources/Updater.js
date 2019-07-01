/**
 * @class Updater
 *
 * Manages the MS CodePush process.
 *
 * Exports a singleton instance.
 */
"use strict";

import async from "async";
import EventEmitter from "eventemitter2";
import analytics from "./Analytics.js";
import { version as configXmlVersion } from "../../../version.js";

var config = require("../config/config.js");

const deploymentKeys = config.codepush.keys;

var platform = "ios";
if (String(navigator.userAgent).match("Android")) {
    platform = "android";
}

class Updater extends EventEmitter {
    constructor() {
        super();

        // Uncomment to disable updater
        //return;

        document.addEventListener(
            "deviceready",
            () => {
                this.sync();
            },
            false
        );
        document.addEventListener("resume", () => {
            this.sync();
        });
    }

    /**
     * Synchronize code with the latest from CodePush.
     *
     * @param {object} [keys]
     *      Optional. Can override default keys by supplying your own here.
     *      {
     *          ios: <string>,
     *          android: <string>
     *      }
     * @param {object} [options]
     * @param {boolean} [options.preventRestart]
     *      By default, CodePush looks for the `mandatory install` flag in
     *      the downloaded package, and if present CodePush will force restart
     *      immediately instead of waiting. Set to true to prevent this.
     */
    sync(keys = deploymentKeys, options = {}) {
        if (typeof cordova == "undefined") this.emit("upToDate");

        // `codePush` object will be available globally if plugin is present.
        /* global InstallMode codePush SyncStatus */
        if (!window.codePush) return;

        // var options = {
        // deploymentKey: "",
        // installMode: InstallMode.ON_NEXT_RESTART,
        // mandatoryInstallMode: InstallMode.IMMEDIATE,
        // minimumBackgroundDuration: InstallMode.ON_NEXT_RESUME,
        // ignoreFailedUpdates: true,
        // updateDialog: {},
        // };

        if (options.preventRestart) {
            options.mandatoryInstallMode = InstallMode.ON_NEXT_RESTART;
        }

        options.deploymentKey = keys[platform] || deploymentKeys[platform];

        codePush.sync(
            (status) => {
                switch (status) {
                    case SyncStatus.ERROR:
                        this.emit("error");
                        console.log("CodePush sync error");
                        break;

                    case SyncStatus.UP_TO_DATE:
                        this.emit("upToDate");
                        this.getPackageInfo();
                        break;

                    default:
                    case SyncStatus.UPDATE_IGNORED:
                    case SyncStatus.CHECKING_FOR_UPDATE:
                    case SyncStatus.AWAITING_USER_ACTION:
                        // do nothing
                        break;

                    case SyncStatus.DOWNLOADING_PACKAGE:
                        this.emit("downloadStart");
                        break;

                    case SyncStatus.INSTALLING_UPDATE:
                        this.emit("installing");
                        break;

                    case SyncStatus.UPDATE_INSTALLED:
                        this.emit("installed");
                        this.getPackageInfo();
                        break;
                }
            },
            options,
            (progress) => {
                var percentage = Math.round(
                    (progress.totalBytes / progress.receivedBytes) * 100
                );
                this.emit("downloading", percentage);
            }
        );
    }

    /**
     * @return {Promise}
     */
    getPackageInfo() {
        return new Promise((resolve, reject) => {
            var defaultInfo = {
                version: configXmlVersion,
                description: "",
                label: "",
                deploymentKey: deploymentKeys[platform]
            };

            var packageInfo = defaultInfo;

            async.series(
                [
                    (next) => {
                        if (!window.codePush) {
                            return next();
                        }
                        codePush.getCurrentPackage(
                            (results) => {
                                if (results == null) {
                                    // CodePush has not updated on this app instance
                                    // before, so keep defaults.
                                } else {
                                    console.log("CodePush package:", results);
                                    packageInfo = {
                                        version: results.appVersion,
                                        description: results.description,
                                        label: results.label,
                                        deploymentKey: results.deploymentKey
                                    };
                                }

                                next();
                            },
                            (err) => {
                                console.log(
                                    "failed to get CodePush package",
                                    err
                                );
                                err.message = "CodePush error: " + err.message;
                                analytics.logError(err);

                                next(err);
                            }
                        );
                    }
                ],
                (err) => {
                    if (err) reject(err);
                    else {
                        analytics.tag({
                            "codepush.label": packageInfo.label,
                            "codepush.deployment": packageInfo.deploymentKey
                        });
                        resolve(packageInfo);
                        this.emit("info", packageInfo);
                    }
                }
            );
        });
    }

    restart() {
        codePush.restartApplication();
    }
}

var updater = new Updater();
export default updater;

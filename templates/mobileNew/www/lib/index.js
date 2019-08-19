// index.js
// This is the initial bootstrap file for our Application

/* global StatusBar Cordova  */
import initMissingFunctionality from "./platform/init/initMissingFunctionality";
import initBootupTimeout from "./platform/init/initBootupTimeout";
import initDefaultPages from "./platform/init/initDefaultPages";
import initResources from "./platform/init/initResources";
import Log from "./platform/resources/Log";
import Page from "./platform/resources/Page.js";

var config = require("./config/config.js");

/*
 * Prepare Missing Functionality
 */
initMissingFunctionality
    .init()
    .then(() => {
        // you can pass in the # milliseconds for the timeout:
        // the default is 10s -> 10000 ms.
        return initBootupTimeout.init(/*10000*/);
    })
    // Put the remaining bootstrap steps between here and // .clear()
    .then(() => {
        return initDefaultPages.init();
    })
    .then(() => {
        return initResources.init();
    })
    .then(() => {
        //// System DeviceReady signal
        return new Promise((resolve /* , reject */) => {
            // if we are in a cordova enviroment (on a mobile platform)
            // we can just wait for the signal:
            if (typeof cordova != "undefined") {
                document.addEventListener(
                    "deviceready",
                    () => {
                        StatusBar.styleBlackOpaque();
                        resolve();
                    },
                    false
                );

                document.addEventListener("orientationchange", () => {
                    Page.resize(); // was needed previously for Webix
                });
            } else {
                // if not in a cordova environment, then we need to
                // simulate the deviceready signal, so our pages can
                // initialize.
                setTimeout(() => {
                    Page.setDeviceReady();
                    resolve();
                }, 0);
            }
        });
    })
    .then(() => {
        if (typeof Cordova == "undefined") {
            // we are most likely running in a browser for testing:
            initDefaultPages.consoleDebugging();
        }
    })
    .then(() => {
        return initBootupTimeout.clear();
    })
    .then(() => {
        Log("bootstrap complete");
        if (
            config.platform.encryptedStorage ||
            config.platform.passwordProtected
        ) {
            initDefaultPages.show("password");
        } else {
            initDefaultPages.show("app");
        }
    });

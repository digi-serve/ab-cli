// index.js
// This is the initial bootstrap file for our Application

/* global StatusBar */
import initMissingFunctionality from "./init/initMissingFunctionality";
import initBootupTimeout from "./init/initBootupTimeout";
import initDefaultPages from "./init/initDefaultPages";
import initResources from "./init/initResources";
import Log from "./resources/Log";
import Page from "./resources/Page.js";
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
        return initBootupTimeout.clear();
    })
    .then(() => {
        Log("bootstrap complete");
        initDefaultPages.show("password");
    });

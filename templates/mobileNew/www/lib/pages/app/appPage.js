/* eslint-disable */
/**
 * @class AppPage
 *
 * This is the container page for the main application.
 * There can be multiple app sub pages within.
 *
 */
"use strict";

import Page from "../../resources/Page.js";

import ABApplicationList from "../../applications/applications";
import account from "../../resources/Account.js";
import analytics from "../../resources/Analytics.js";
import appFeedback from "../../resources/AppFeedback.js";
import camera from "../../resources/Camera.js";
import log from "../../resources/Log.js";
import Network from "../../resources/Network.js";
import notifications from "../../resources/Notifications.js";
import qrPage from "../qrScanner/qrScanner.js";
import Shake from "shake.js";
import { storage, Storage } from "../../resources/Storage.js";
import updater from "../../resources/Updater.js";

// // import moment from 'moment';

import NavMenu from "../../applications/navMenu/app.js";
const navMenu = new NavMenu();

import Logs from "../../applications/Logs/app.js";
const Logger = new Logs();

import SettingsComponent from '../settings/settings.js';

export default class AppPage extends Page {
    /**
     */
    constructor() {
        super("opstool-app", "lib/pages/app/app.html");

        // For console debugging only. Don't use these in the app like this.
        // window.appPage = this;
        // window.appPage.account = account;

        // Can shake device to activate Feedback tool
        this.shakeEvent = new Shake({ threshold: 15 });
        window.addEventListener(
            "shake",
            () => {
                this.activateFeedback();
            },
            false
        );

        this.storage = storage;
        this.templates = {};
        this.components = {};
        this.applications = ABApplicationList;
        this.dataReady = $.Deferred();
        this.routerReady = $.Deferred();

        var updateOnLogin = localStorage.getItem("updateOnLogin");
        if (updateOnLogin == "true") {
            this.updateOnLogin = true;
        } else if (updateOnLogin == "false") {
            this.updateOnLogin = false;
        } else {
            localStorage.setItem("updateOnLogin", "true");
            this.updateOnLogin = true;
        }

        // AB.platform({
        //     account: account,
        //     storage: storage
        // });

        // Framework7 is the UI library
        this.app = new Framework7({
            theme: "ios",
            toast: {
                closeTimeout: 5000,
                position: "top"
            },
            statusbar: {
                iosOverlaysWebView: false,
                overlay: false
            },
            panel: {
                swipe: "both"
            },
            // All of these will be available to F7 Components
            // under `this.$root.{name}`
            data: () => {
                return {
                    appPage: this,

                    account: account,
                    updater: updater,
                    analytics: analytics,
                    storage: storage,
                    log: log,
                    camera: camera,

                    getComponent: (name) => {
                        return this.components[name];
                    },

                    // Returns the mobile app, which is the application that
                    // resides in the /lib/app/applications folder.
                    // It is not the same thing as the ABApplication object.
                    // It is not the same thing as the Framework7 app object.
                    // It is also not the same thing as the actual Cordova
                    // mobile app that this is all running in.
                    // getMobileApp: (name) => {
                    //     return this.applications.find((a) => {
                    //         return a.id == name;
                    //     });
                    // },

                    // return the ABApplication matching the given .id
                    getApplication: (id) => {
                        var mApp = this.applications.find((a) => {
                            return a.application.id == id;
                        });
                        if (mApp) {
                            return mApp.application;
                        }
                        return null;
                    }
                };
            },

            // Root DOM element for Framework7
            root: this.$element.get(0)
        });

        // Log function can use F7 to create alert dialogs
        log.init({ app: this.app });

        // Component objects that will be referenced by F7 component code
        this.components["settings"] = new SettingsComponent(this.app);

        this.app.on("pageInit popupOpen", (page) => {
            // Log Framework7 page views
            // if we cannot populate this we need let the app know we are hitting a dead end without an error
            var pageName = "unknown-page-name";
            // if this is a popup we need to look at the dom to get the title
            if (page.type && page.type == "popup") {
                var popUp = page.el
                    .querySelector(".title")
                    .innerHTML.toLowerCase()
                    .replace(" ", "-");
                pageName = "/popup/" + popUp;
            } else if (page.route && page.route.path) {
                // if this is a normal page we just grab the route path
                pageName = page.route.path;
            }
            analytics.pageView(pageName);
        });

        storage.on("ready", () => {
            this.prepareData();
        });
    }

    /**
     * Load the locally stored data.
     */
    prepareData() {
        // Catch if the promise timed out without resolving or rejecting
        var timeout = setTimeout(() => {
            console.log("prepareData timed out");
            analytics.log(
                "appPage.prepareData() did not complete after 10 seconds"
            );
        }, 10000);

        Network.once("error.badAuth", (/* err */) => {
            this.app.dialog.close();
            this.app.dialog.alert(
                "<t>Make sure you have scanned the correct QR code for your account. If the problem persists, please contact an admin for help.</t>",
                "<t>Problem authenticating with server</t>"
            );
        });

        // Load data from persistent storage into `this` object
        Promise.all([
            // Load account authToken
            account.init({ app: this.app }),
            // User ID
            this.loadData("uuid", null),
            this.components["settings"].dataReady
            // Load cached ren data
            // this.applications.find((i)=> {return i.id=='HRIS'}).initializeMyPersonData(),
        ])
            .then(() => {
                analytics.info({ username: this.uuid });

                // Initialize the secure relay.
                // This relies on the account object from the previous step.
                return Network.init(account);
            })
            .then(() => {
                // Are the AB Applications in the middle of being reset?
                this.pendingApplicationReset = false;
                Network.on("offline", () => {
                    // if we are interrupting a reset() sequence, warn the user:
                    if (this.pendingApplicationReset) {
                        this.closeRelayLoader();
                        this.app.dialog.alert(
                            "<t>Make sure you are connected to the Internet before trying to update your data.</t>",
                            "<t>No Network Connection</t>"
                        );
                    }
                });
                Network.on("online", () => {
                    // if we had an interrupted reset() sequence, try it again:
                    if (this.pendingApplicationReset) {
                        this.forceApplicationReset();
                    }
                });

                return new Promise((resolve /* , reject */) => {
                    if (account.authToken) {
                        resolve();
                    } else {
                        // No data found.
                        // Try to import settings & contacts from old app.
                        var oldDB = new Storage("sdc_contacts");
                        oldDB
                            .get("authToken")
                            .then((value) => {
                                // Import authToken
                                if (value) {
                                    console.log(
                                        "::: importing old credentials"
                                    );
                                    return account
                                        .setAuthToken(value)
                                        .then(() => {
                                            // now that we have the old authToken
                                            // try to init the Relay again:
                                            console.log(
                                                "::: performing Network.init() "
                                            );
                                            return Network.init();
                                        })
                                        .then(() => {
                                            return oldDB.get("uuid");
                                        });
                                } else {
                                    throw new Error("authToken not found");
                                }
                            })
                            .then((/* value */) => {
                                // Import user ID

                                // if (value) {
                                // this.uuid = value;
                                // return this.saveData('uuid')
                                //     .then(()=>{
                                //         return oldDB.get('contacts');
                                //     })
                                // }
                                return oldDB.get("contacts");
                            })
                            .then((/* oldContacts */) => {
                                // Ignore contacts
                                // ...

                                oldDB.clear("authToken");
                                oldDB.clear("uuid");
                                // oldDB.clear('contacts'); // ??

                                resolve();
                            })
                            .catch((err) => {
                                err.message =
                                    "Error while importing old contacts: " +
                                    err.message;
                                console.log(err);
                                resolve();
                            });
                    }
                }).then(() => {
                    clearTimeout(timeout);
                    this.dataReady.resolve();
                });
            })
            .catch((err) => {
                clearTimeout(timeout);
                console.log(err);
                analytics.log("Error during AppPage.prepareData():");
                analytics.logError(err);

                // Question: do we always .resolve() so .begin() can get called?
                // Depends what kind of error it was. If the authToken or the relay
                // failed, then there are probably going to be more problems
                // ahead.
                this.dataReady.resolve();
            });
    }

    /**
     * Initialize things that depend on the DOM
     */
    init() {
        // This was needed in the past because the QR code scanner could
        // remain active even after the app reloaded.
        qrPage.hide();

        // When the QR code scanner page is closed after completing a scan,
        // show this app page again.
        qrPage.on("hide", () => {
            this.show();
        });

        this.dataReady.done(() => {
            this.begin();
        });
    }

    /**
     * Start up main Framework7 routing.
     * Requires app data to already be initialized.
     */
    begin() {
        // on bootup, try to flush any network Queues
        Network.queueFlush()
            .then(() => {
                console.log("appPage:begin(): Network Queue flushed.");
            })
            .catch((err) => {
                analytics.log("appPage:begin(): unable to flush Network Queue");
                analytics.logError(err);
            });

        // Start listening for shake gesture
        this.shakeEvent.start();

        // Initialize the AB applications
        this.applications.forEach((abApp) => {
            abApp.once("init.timeout", () => {
                analytics.log(
                    "ABApplication timed out during init(): " + abApp.id
                );
            });

            abApp.init(this).catch((err) => {
                console.log("Failed to init() ABApplication: " + abApp.id);
                console.log(err.message);
                console.log(err.stack);
                analytics.logError(err);
            });
        });

        // Handle deep links
        if (window.universalLinks) {
            /* eslint-disable-next-line no-undef */
            universalLinks.subscribe(null, (eventData) => {
                console.log("Deep link");
                console.log("Data:", eventData);
                analytics.event("Deep link");

                if (eventData.params && eventData.params.settings) {
                    this.app.dialog.confirm(
                        "<t>This will replace your contact list</t>",
                        "<t>Import settings?</t>",
                        () => {
                            analytics.event("Import deep link data");
                            account.importSettings(eventData.params.settings);
                        }
                    );
                }
            });
        }

        // After QR code / deep link import, restart the AB Applications
        account.on("imported", (importState) => {
            if (importState.authToken == true) {
                this.forceApplicationReset();
            }
        });

        //// Begin Framework7 router

        // Menu view
        this.menuView = this.app.views.create("#left-view", {
            url: "/nav/",
            routes: navMenu.routes
        });

        // Log view
        this.logView = this.app.views.create("#right-view", {
            url: "/log/",
            routes: Logger.routes
        });

        // Main view
        var mainViewData = {
            url: "/",
            routes: [
                {
                    // Root page
                    path: "/",
                    componentUrl: "./lib/applications/landingPage/templates/landing.html"
                },
                {
                    // Settings page
                    path: "/settings/",
                    componentUrl: "./lib/applications/settings/templates/settings.html"
                }
            ]
        };
        this.applications.forEach((app) => {
            mainViewData.routes = mainViewData.routes.concat(app.routes);
        });
        this.appView = this.app.views.create("#main-view", mainViewData);
        appFeedback.init(this.appView.router);
        this.routerReady.resolve();

        // Android hardware back button
        document.addEventListener(
            "backbutton",
            () => {
                this.appView.router.back();
            },
            false
        );

        //// OneSignal
        // Notification received while using app
        notifications.on("received", (msg) => {
            // var data = msg.data || {};
            //if (!data.type) {
            // This is just a plain message for displaying.
            this.app.dialog.alert(msg.body, msg.title);
            return;
            //}

            /*
            // Notification about an appointment
            this.app.dialog.create({
                title: msg.title,
                text: msg.body,
                buttons: [
                    {
                        text: '<t>Show me</t>',
                        onClick: () => {
                            this.components['coaching'].handleAppointmentNotification(data.type, data.contact, data.session);
                        },
                        close: true
                    },
                    {
                        text: '<t>Ignore</t>',
                        close: true
                    }
                ],
            }).open();
            */
        });
        // Notification received while outside of app.
        notifications.on("opened", (/* msg */) => {
            // var data = msg.data || {};
            // User had to read the notification in order to open the app,
            // so no point displaying it again.
            /*
            if (data.type) {
                this.components['coaching'].handleAppointmentNotification(data.type, data.contact, data.session);
            }
            */
        });
    }

    /**
     * Retrieve stored value from storage. By default, the value will be saved
     * into `this[key]`.
     *
     * @param {string} key
     * @param {anything} [defaultValue]
     *      Optional value to use if there was no stored value.
     * @param {function} [callback]
     *      Instead of `defaultValue` parameter, this callback function can be
     *      used to handle the stored value. `this[key]` will not be modified
     *      in this case.
     *
     * @return {Promise}
     */
    loadData(key, defaultValue) {
        return this.storage
            .get(key)
            .then((value) => {
                if (typeof defaultValue == "function") {
                    var callback = defaultValue;
                    callback(value);
                } else {
                    this[key] = value || defaultValue;
                }

                return value;
            })
            .catch((err) => {
                console.log("Error reading from storage: " + key);
                analytics.logError(err);

                log.alert(
                    "<t>There was a problem reading your data</t>",
                    "<t>Sorry</t>"
                );
            });
    }

    /**
     * Save a value to storage.
     *
     * @param {string} key
     * @param {anything} [value]
     *      The value to save.
     *      By default, the value will be read from `this[key]`.
     * @return {Promise}
     */
    saveData(key, value = undefined) {
        if (arguments.length == 0) {
            // Save all user modifiable content
            return Promise.all([]);
        } else {
            if (value === undefined) {
                value = this[key];
            }
            return this.storage.set(key, value);
        }
    }

    /**
     * Display the relay progress dialog.
     *
     * @param {string} [title]
     */
    openRelayLoader(title = null) {
        this.relayJobsTotal = 0;
        this.relayJobsDone = 0;

        Promise.resolve()
            .then(() => {
                return Network.getTokens();
            })
            .then((tokens = {}) => {
                this.relayJobsTotal = Object.keys(tokens).length;
            });

        if (!this.relayLoaderDialog) {
            // Create F7 dialog
            this.relayLoaderDialog = this.app.dialog.create({
                closeByBackdropClick: false
            });

            // Put the Relay Loader inside the dialog
            var $relayLoader = $("#relay-loader"); // see templates/app.js
            $(this.relayLoaderDialog.el)
                .find(".dialog-inner")
                .append($relayLoader);

            // Create the observer as an arrow function so `this` can be referenced
            this._relayObserver = (status) => {
                if (status == "added") {
                    this.relayJobsTotal += 1;
                } else if (status == "done") {
                    this.relayJobsDone += 1;
                }
                var percentage = Math.round(
                    (this.relayJobsDone / this.relayJobsTotal) * 100 || 0
                );
                this.app.progressbar.set(
                    "#relay-loader .progressbar",
                    percentage,
                    100
                );
            };
        }

        if (title) {
            this.relayLoaderDialog.setTitle(title);
        }
        this.relayLoaderDialog.open();
        this.app.progressbar.set("#relay-loader .progressbar", 0, 0);

        Network.on("job.*", this._relayObserver);
    }

    /**
     * Remove the relay progress dialog
     */
    closeRelayLoader() {
        if (this.relayLoaderDialog) {
            this.relayLoaderDialog.close();
        }
        Network.off("job.*", this._relayObserver);
    }

    /**
     * Request data through the relay, for all ABApplications, then wait for
     * the responses to finish.
     *
     * A modal dialog box will be displayed during the process.
     *
     * @param {Object} [options]
     * @param {boolean} [options.refreshPage]
     *      Refresh the page after completion?
     * @return {Promise}
     */
    fetchApplicationData(options = {}) {
        this.openRelayLoader("<t>Updating Data</t>");

        // Show message if it takes too long
        var waitToClose = setTimeout(() => {
            this.closeRelayLoader();
            this.app.dialog.alert(
                "<t>Data update is taking a long time, there may have been a problem. Please try again later.</t>",
                "<t>Sorry</t>"
            );
            analytics.log("Timeout (45 secs) during fetchApplicationData()");
        }, 45000);

        // create a storage container for all app inits
        var allClears = [];
        var allResets = [];

        // tell all apps to .init() again
        this.applications.forEach((abApp) => {
            if (abApp.clearSystemData) {
                allClears.push(abApp.clearSystemData());
            }
            allResets.push(abApp.reset());
        });

        // listen for when inits are complete
        return Promise.all(allClears)
            .then(() => {
                return Promise.all(allResets);
            })
            .then(() => {
                clearTimeout(waitToClose);
                this.closeRelayLoader();

                if (options.refreshPage) {
                    this.appView.router.refreshPage();
                }
            })
            .catch((err) => {
                this.closeRelayLoader();
                clearTimeout(waitToClose);
                console.log(err.message);
                console.log(err.stack);
                analytics.log("Error during fetchApplicationData()");
                throw err;
            });
    }

    /**
     * Reinitialize the AB Applications.
     * This is called after a new authToken is imported.
     *
     * @return {Promise}
     */
    forceApplicationReset() {
        this.openRelayLoader("<t>Connecting applications</t>");
        this.pendingApplicationReset = true;
        this.appResetOK = true;

        console.log("::: forceApplicationReset(): Relay.init().");
        return Network.init()
            .then(() => {
                var allInits = [];

                // tell all AB apps to .init() again:
                this.applications.forEach((abApp) => {
                    allInits.push(abApp.reset());
                });
                console.log(
                    "::: importSettings(): App.reset() x" + allInits.length
                );
                return Promise.all(allInits);
            })
            .then(() => {
                this.pendingApplicationReset = false;
                this.closeRelayLoader();
                if (this.appResetOK) {
                    analytics.event("QRInitFinished");
                    console.log("::: QRInitFinished :::");
                    this.app.panel.open("left");
                }
            })
            .catch((err) => {
                this.closeRelayLoader();
                console.log("::: forceApplicationReset(): error");
                analytics.logError(err);
            });
    }

    /**
     * importCancel()
     * allows our applications to cancel the application reset process if they
     * detect an error.
     */
    importCancel() {
        this.closeRelayLoader();
        this.appResetOK = false;

        // Clear account credentials from device, since there was a problem
        // with them, apparently.
        // Question: could this result in a healthy account getting reset
        // because a query glitches out on the server?
        account.setAuthToken(null);
    }

    /**
     * Reload the current Framework7 page
     */
    reload() {
        this.appView.router.navigate(this.appView.router.currentRoute.path, {
            reloadCurrent: true,
            force: true,
            ignoreCache: true
        });
    }

    /**
     * Activate the feedback form
     */
    activateFeedback() {
        try {
            appFeedback.open();
        } catch (err) {
            console.log("Feedback error", err);
            this.app.dialog.alert(
                "<t>There was a problem sending feedback</t>",
                "<t>Sorry</t>"
            );
            appFeedback.close();
        }
    }
}

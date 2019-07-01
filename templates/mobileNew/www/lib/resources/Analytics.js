/**
 * @class Analytics
 *
 * Manages the reporting to the Countly server
 *
 * Exports a singleton instance.
 */
"use strict";

import EventEmitter from "eventemitter2";
import "./Countly.js"; // copied from Countly cordova plugin

var config = require("../config/config.js");

class Analytics extends EventEmitter {
    constructor() {
        super();
        this.sentry = null;
        this.ready = $.Deferred();
    }

    init() {
        // Sentry.io for crash reporting
        if (window.cordova) {
            try {
                console.log("Sentry.io plugin begin require/init");
                this.sentry = window.cordova.require("sentry-cordova.Sentry");
                console.log("Sentry.io plugin required, now init");
                this.sentry.init({
                    dsn: config.sentryio.dsn, // "https://9df6fd4623934fadb4a9ee6bb6ec887f@sentry.io/1186956",
                    debug: true
                });
                console.log("Sentry.io plugin initilized");
            } catch (err) {
                // Sentry.io plugin not installed
                console.log("Sentry.io plugin not installed");
                this.sentry = null;
            }
        }

        // Countly for everything else
        if (window.Countly && window.cordova) {
            Countly.init(config.countly.url, config.countly.appKey);
            Countly.start();
            console.log("analytics init()");
        }

        this.ready.resolve();
    }

    /**
     * Set information about the current user.
     *
     * Be careful about what you set here because it will be stored on
     * analytics servers which are outside the VPN.
     *
     * @param {Object} data
     *    {
     *       id: {String}, // for Sentry only
     *       name: {String},
     *       username: {String},
     *       email: {String},
     *       custom: {JSON} // for Countly only
     *    }
     */
    info(data = {}) {
        this.ready.then(() => {
            if (window.Countly && window.cordova) {
                Countly.setUserData(data);
            }

            if (this.sentry) {
                this.sentry.configureScope((scope) => {
                    scope.setUser({
                        id: data.id || undefined,
                        email: data.email || undefined,
                        username: data.username || data.name || undefined
                    });
                });
            }
        });
    }

    /**
     * Record a page view.
     * @param {string} pageName
     */
    pageView(pageName) {
        if (window.Countly && window.cordova) {
            Countly.recordView(pageName);
        }

        if (this.sentry) {
            this.sentry.addBreadcrumb({
                category: "page",
                message: pageName
            });

            this.tag("page", pageName);
        }
    }

    /**
     * Set one or more tags in Sentry
     *
     * @param {string} key
     * @param {string} value
     *
     * OR
     *
     * @param {JSON} tags
     *      Multiple key-value pairs.
     */
    tag(key, value) {
        this.ready.then(() => {
            if (!this.sentry) return;

            var tags = {};

            // Single tag. key & value
            if (typeof key == "string") {
                tags[key] = value;
            }
            // Multiple tags passed in as JSON
            else if (typeof key == "object") {
                tags = key;
            }
            // Syntax error
            else {
                throw new SyntaxError("Wrong parameters for analytics.tag()");
            }

            this.sentry.configureScope((scope) => {
                for (var key in tags) {
                    scope.setTag(key, tags[key]);
                }
            });
        });
    }

    /**
     * Record an event.
     * @param {string} name
     * @param {object} data
     */
    event(name, data = {}) {
        if (window.Countly && window.cordova) {
            var packet = {
                eventName: name,
                eventCount: 1
            };
            if (Object.keys(data).length > 0) {
                packet.segments = data;
            }
            Countly.sendEvent(packet);
        }

        if (this.sentry && !data.stack) {
            this.sentry.addBreadcrumb({
                category: "event",
                message: name
            });
        }
    }

    /**
     * Log an error message.
     * @param {Error/String} err
     * @return {Object}
     *      {
     *          "name": {string},
     *          "message": {string}
     *      }
     */
    logError(err) {
        var name = err.name || "Error";
        var data = {
            message: err.message || err._message || err
        };
        if (err.stack) {
            data.stack = err.stack;
        }

        this.ready.then(() => {
            if (this.sentry) {
                this.sentry.captureException(err);
            }

            // For Countly
            this.event(name, data);
        });

        return {
            name: name,
            message: data.message
        };
    }

    /**
     * Log a text message to Sentry.
     * @param {String} message
     */
    log(message) {
        console.log(message);

        this.ready.then(() => {
            if (this.sentry) {
                this.sentry.captureMessage(message);
            }
        });
    }
}

var analytics = new Analytics();
export default analytics;

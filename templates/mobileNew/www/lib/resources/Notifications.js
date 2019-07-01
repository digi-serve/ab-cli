/**
 * @class Notifications
 *
 * Manages the connection to OneSignal.
 *
 * Exports a singleton instance.
 */
"use strict";

import analytics from "./Analytics.js";
import EventEmitter from "eventemitter2";

var config = require("../config/config.js");

class Notifications extends EventEmitter {
    constructor() {
        super();
    }

    init() {
        if (!window.plugins || !window.plugins.OneSignal) return;

        // Prevent OneSignal from tracking location
        if (window.plugins.OneSignal.setLocationShared) {
            window.plugins.OneSignal.setLocationShared(false);
        }

        window.plugins.OneSignal.startInit(config.onesignal.appID)
            .inFocusDisplaying(
                window.plugins.OneSignal.OSInFocusDisplayOption.None
            )
            //.inFocusDisplaying(window.plugins.OneSignal.OSInFocusDisplayOption.InAppAlert)
            //.inFocusDisplaying(window.plugins.OneSignal.OSInFocusDisplayOption.Notification)

            // When notification opened from outside app
            .handleNotificationOpened((jsonData) => {
                analytics.event("received notification outside app");
                console.log("notification opened:", jsonData);
                this.emit("opened", this.parse(jsonData.notification));

                return {
                    notification: jsonData.notification,
                    action: {
                        type: "Opened"
                    }
                };
            })

            // When notification received while inside app
            .handleNotificationReceived((notification) => {
                analytics.event("received notification inside app");
                console.log("notification received:", notification);
                this.emit("received", this.parse(notification));

                return {
                    notification: notification,
                    action: {
                        type: "Opened"
                    }
                };
            })

            .endInit();
    }

    /**
     * @param {object} notification
     * @return {object}
     */
    parse(notification) {
        var result = {
            title: "Notification",
            body: "No content?",
            data: null
        };
        if (notification.payload) {
            result.title = notification.payload.title;
            result.body = notification.payload.body;
            result.data = notification.payload.additionalData;
        }
        return result;
    }

    /**
     * Get a OneSignal tag value for this user
     *
     * @param {String} key
     * @param {boolean} [useCache]
     * @return {Deferred}
     *      Resolves with the tag value
     */
    getUserValue(key, useCache = false) {
        var dfd = $.Deferred();

        this.tagCache = this.tagCache || {};

        if (!window.plugins || !window.plugins.OneSignal) dfd.reject();
        else if (!useCache) {
            window.plugins.OneSignal.getTags((tags) => {
                console.log("OneSignal tags:", tags);

                this.tagCache = tags;
                dfd.resolve(tags[key]);
            });
        } else {
            dfd.resolve(this.tagCache[key]);
        }

        return dfd;
    }

    /**
     * Set a OneSignal tag value for this user
     *
     * @param {String} key
     * @param {String} val
     */
    setUserValue(key, val) {
        if (!window.plugins || !window.plugins.OneSignal) return;
        window.plugins.OneSignal.sendTag(key, val);
    }
}

var notifications = new Notifications();
export default notifications;

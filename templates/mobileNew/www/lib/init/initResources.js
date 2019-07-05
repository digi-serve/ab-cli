/*
 * initResources.js
 * Setup the main application Pages
 */
import analytics from "../resources/Analytics.js";
import notifications from "../resources/Notifications.js";
// Just including the Storage module makes sure it is initialized early
// in the app startup.
/* eslint-disable-next-line no-unused-vars */
import { storage } from "../resources/Storage.js";

export default {
    init: () => {
        try {
            analytics.init();
        } catch (err) {
            console.log(err);
            $.alert(
                (err.message || "") + "<br />" + (err.stack || ""),
                "Error starting analytics system"
            );
        }

        try {
            notifications.init();
        } catch (err) {
            console.log(err);
            $.alert(
                (err.message || "") + "<br />" + (err.stack || ""),
                "Error starting notifications system"
            );
        }
        return Promise.resolve(); // nothing async, so just return
    }
};

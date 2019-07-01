/*
 * initBootupTimeout.js
 * prepare a timeout for the whole App Bootup process.
 */
var initTimeout = null;
export default {
    init: (timeoutVal = 10000) => {
        // If app does not init within 10 seconds, something is probably wrong
        initTimeout = setTimeout(() => {
            var linkText = " ";
            var isAndroid = navigator.userAgent.match(/Android/);
            var isCrosswalk = navigator.userAgent.match(/Crosswalk/);

            // For Android, provide a link to download the Crosswalk version
            if (isAndroid && !isCrosswalk) {
                linkText +=
                    "You may try to download this " +
                    '<a href="https://sdc.appdevdesigns.net/connexted-crosswalk.apk" target="_system">substitute version</a>' +
                    " instead.";
            }

            $.alert(
                "<p>" +
                    "This app might not work on your device." +
                    linkText +
                    "</p><p>" +
                    "If the problem continues, please let us know what device" +
                    " and system version you are using and we will try to" +
                    " solve it." +
                    "</p>",
                "<t>Sorry</t>"
            );
        }, timeoutVal);

        return Promise.resolve(); // nothing async, so just return
    },

    clear: () => {
        clearTimeout(initTimeout);
    }
};

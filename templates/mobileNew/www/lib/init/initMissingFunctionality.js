/*
 * initMissingFunctionality.js
 * prepare the system with any missing functionality / legacy support:
 */

import analytics from "../resources/Analytics.js";

//// Previously we manually imported these libraries and made sure they were
//// global, however we have moved these into index.html and they are global
//// in scope.
// import _Promise from 'es6-promise';
// import moment from 'moment';
// import lodash from 'lodash';

window.analytics = analytics; // for console debugging purposes

//
// Add Object.assign() support for older Android versions
//
if (typeof Object.assign != "function") {
    // Must be writable: true, enumerable: false, configurable: true
    Object.defineProperty(Object, "assign", {
        value: function assign(target /*, varArgs*/) {
            // .length of function is 2
            "use strict";
            if (target == null) {
                // TypeError if undefined or null
                throw new TypeError(
                    "Cannot convert undefined or null to object"
                );
            }

            var to = Object(target);

            for (var index = 1; index < arguments.length; index++) {
                var nextSource = arguments[index];

                if (nextSource != null) {
                    // Skip over if undefined or null
                    for (var nextKey in nextSource) {
                        // Avoid bugs when hasOwnProperty is shadowed
                        if (
                            Object.prototype.hasOwnProperty.call(
                                nextSource,
                                nextKey
                            )
                        ) {
                            to[nextKey] = nextSource[nextKey];
                        }
                    }
                }
            }
            return to;
        },
        writable: true,
        configurable: true
    });
}

export default {
    init: () => {
        return Promise.resolve(); // nothing async, so just return
    }
};

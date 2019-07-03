/**
 * @class AppFeedback
 *
 * Manages the connection to the server, including authentication.
 *
 * Exports a singleton instance.
 */
"use strict";

//import { Feedback } from '@ivoviz/feedback.js';
import { Feedback } from "./Feedback.js";
import EventEmitter from "eventemitter2";
import updater from "./Updater.js";

var config = require("../config/config.js");

class AppFeedback extends EventEmitter {
    constructor() {
        super();
        this.appView = null;

        this.feedback = new Feedback(
            {
                allowDrawing: false,
                darkenCanvas: false,
                footnote: "",
                endpoint: "https://...", // not used
                placeholderText: "Describe your issue or share your ideas.",
                labels: {
                    sendFeedback: "</t>Send Feedback</t>",
                    includeScreenshot: "<t>Include Screenshot</t>",
                    cancel: "<t>cancel</t>",
                    //dragger: 'dragger',
                    //highlight: 'highlight',
                    //blackout: 'blackout',
                    //remove: 'remove',
                    //done: 'done',
                    sending: "<t>sending...</t>",
                    send: "<t>send</t>",
                    sent: "<t>sent</t>",
                    error: "<t>error...</t>",
                    back: "<t>back</t>",
                    ok: "<t>ok</t>",
                    close: "<t>close</t>"
                },
                fetch: (url, options) => {
                    // Send feedback request over the relay
                    return new Promise((resolve, reject) => {
                        // Close the feedback window after 15 seconds
                        // if the sending got stuck for some reason.
                        var timeout = setTimeout(() => {
                            this.close();
                        }, 15000);

                        // This is the feedback data
                        var body = options.body;
                        if (typeof body == "string") {
                            // AB.Comm.Relay.post() wants the data in object form
                            try {
                                body = JSON.parse(body);
                            } catch (e) {
                                /* */
                            }
                        }

                        // Add metadata
                        body.userAgent = navigator.userAgent;
                        body.packageInfo = {};
                        body.route = "unknown";
                        try {
                            body.route = this.router.currentRoute.path;
                        } catch (e) {
                            /* */
                        }

                        updater
                            .getPackageInfo()
                            .then((info) => {
                                body.packageInfo = info;
                                // Send data to server
                                return AB.Comm.Relay.post(
                                    {
                                        url: config.appbuilder.routes.feedback,
                                        data: body
                                    },
                                    { key: "feedback", context: {} }
                                );
                            })
                            .then(() => {
                                clearTimeout(timeout); // It didn't get stuck, yay!
                                resolve({ ok: true });
                            })
                            .catch(reject);
                    });
                }
            },
            {
                allowTaint: false
            }
        );
    }

    /**
     * Initialize the reference to the Framework7 router object.
     *
     * It is used to get the current page route path.
     *
     * @param {Router} router
     */
    init(router) {
        this.router = router;
    }

    open() {
        // Some page elements use data-uri graphics that cause problems when
        // taking screenshots. So leave those out of the screenshot.
        $(".icon-checkbox").attr("data-html2canvas-ignore", 1);
        $("*").each(function() {
            var $this = $(this);
            var bg = $this.css("background-image");
            if (bg && bg != "none" && bg.match(/data:image/)) {
                $this.attr("data-html2canvas-ignore", 1);
            }
        });
        this.feedback.open();
    }

    close() {
        this.feedback.close();
    }
}

var appFeedback = new AppFeedback();
export default appFeedback;

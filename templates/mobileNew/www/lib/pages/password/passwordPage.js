/**
 * @class PasswordPage
 *
 */
"use strict";

import Page from "../../resources/Page.js";
import { storage } from "../../resources/Storage.js";
// import { t } from "../../resources/Translate.js";
import analytics from "../../resources/Analytics.js";

// For development only
const disableEncryption = false;

export default class PasswordPage extends Page {
    /**
     */
    constructor() {
        super(
            "password-page",
            "lib/app/templates/password.html",
            "css/password.css"
        );
    }

    init() {
        if (disableEncryption) {
            storage.emit("ready");
            return;
        }

        this.$setup = this.$("div.setup");
        this.$setup_p1 = this.$setup.find('input[name="p1"]');
        this.$setup_p2 = this.$setup.find('input[name="p2"]');
        this.setupOK = false;

        this.$unlock = this.$("div.unlock");
        this.$unlock_p1 = this.$unlock.find('input[name="p1"]');

        storage.get("__sdc_initialized").then((value) => {
            // Reveal the SETUP screen for first time use,
            if (value != 1) {
                this.startChecking();
                this.$setup.show();
            }
            // or the SECURITY CHECK screen after that.
            else {
                this.$unlock.show();
            }
        });

        // On Setup screen, handle TAB/ENTER key, or Android/iOS equivalent
        this.$setup_p1.on("keypress", (ev) => {
            if (ev.keyCode == 9 || ev.keyCode == 13) {
                ev.preventDefault();
                this.$setup_p2.focus();
                return false;
            }
        });

        // "Use this passphrase" button or ENTER key submits the form
        this.$setup.find("form").on("submit", (ev) => {
            ev.preventDefault();
            if (this.setupOK) {
                this.$setup_p1.blur();
                this.$setup_p2.blur();
                this.stopChecking();
                storage.set("__sdc_initialized", 1, { forcePlainText: true });

                this.emit("loading");

                storage
                    .setPassword(this.$setup_p1.val())
                    .then(() => {
                        return storage.testCrypto();
                    })
                    .then(() => {
                        this.emit("loadingDone");
                        this.emit("passwordReady");
                        return this.splitAnimation();
                    })
                    .then(() => {
                        this.emit("passwordDone");
                    })
                    .catch((err = "") => {
                        this.emit("loadingDone");
                        $.alert(err.message || err, "<t>Error</t>");
                        analytics.logError(err);
                    });
            }
        });

        // RESET DATA button on Unlock screen
        // Needed in case user forgets password and wants to start over
        this.$unlock.find(".reset-data button").on("click", () => {
            $.confirm(
                "<t>You will lose all data and reset to a blank app</t>",
                "<t>Are you sure?</t>",
                () => {
                    analytics.event("reset data");
                    storage.clearAll().then(() => {
                        document.location.reload();
                    });
                }
            );
        });

        // "Go" button or ENTER key submits the form
        this.$unlock.find("form").on("submit", (ev) => {
            var $go = this.$(".go button");

            $go.prop("disabled", true);
            ev.preventDefault();
            this.$unlock_p1.blur();
            this.$unlock.find(".warning-wrong-pass").hide();
            this.scanAnimation();

            storage
                .setPassword(this.$unlock_p1.val())
                .then(() => {
                    return storage.testCrypto();
                })
                .then(() => {
                    this.scanAnimationStop();
                    this.emit("passwordReady");
                    return this.splitAnimation();
                })
                .then(() => {
                    this.emit("passwordDone");
                    $go.prop("disabled", false);
                })
                .catch((/*err*/) => {
                    this.scanAnimationStop();
                    analytics.event("wrong password");
                    this.$unlock.find(".warning-wrong-pass").show();

                    // Trigger wrong-password CSS animation
                    this.$unlock_p1.removeClass("wrong").addClass("wrong");
                    setTimeout(() => {
                        $go.prop("disabled", false);
                        this.$unlock_p1.removeClass("wrong");
                    }, 1000);
                });
        });
    }

    show() {
        if (disableEncryption) {
            this.emit("passwordDone");
        } else {
            super.show();
        }
    }

    /**
     * On the password setup page, do checks for mismatches and shortness.
     */
    startChecking() {
        this.stopChecking();
        this.checkInterval = setInterval(() => {
            var p1 = this.$setup_p1.val();
            var p2 = this.$setup_p2.val();
            var isValid = true;

            // Both password fields must be filled
            if (!p1 || !p2) {
                isValid = false;
            }

            // Password must be at least 8 chars long
            if (p1 && p1.length < 8) {
                this.$setup.find(".warning-too-short").show();
                isValid = false;
            } else {
                this.$setup.find(".warning-too-short").hide();
            }

            // Passwords must match
            if (p1 && p2 && p1 != p2) {
                this.$setup.find(".warning-no-match").show();
                isValid = false;
            } else {
                this.$setup.find(".warning-no-match").hide();
            }

            if (isValid) {
                this.$setup.find(".all-clear").show();
                this.setupOK = true;
            } else {
                this.$setup.find(".all-clear").hide();
                this.setupOK = false;
            }
        }, 200);
    }

    stopChecking() {
        clearInterval(this.checkInterval);
    }

    /**
     * This animation plays while the storage system forces a password check
     * delay.
     */
    scanAnimation() {
        var $scanner = this.$unlock.find(".scanner");
        var $password = this.$unlock.find("input");

        // workaround for iOS display bug?
        $scanner.show();

        // scanner has position absolute, so it doesn't center naturally
        // like the password box.
        $scanner.width(
            $scanner
                .siblings("input")
                .eq(0)
                .outerWidth()
        );
        $scanner.css("left", parseInt($password.css("margin-left")) - 15);

        // trigger CSS animation
        $scanner.removeClass("animated").addClass("animated");
    }

    scanAnimationStop() {
        var $scanner = this.$unlock.find(".scanner");
        $scanner.removeClass("animated");
        $scanner.hide();
    }

    /**
     * This animation plays after the password has been confirmed. The password
     * page splits open to reveal the app page underneath.
     */
    splitAnimation() {
        return new Promise((resolve /*, reject */) => {
            // trigger CSS animation
            this.$element.removeClass("open-sesame").addClass("open-sesame");
            setTimeout(() => {
                this.$element.removeClass("open-sesame");
                resolve();
            }, 700);
        });
    }
}

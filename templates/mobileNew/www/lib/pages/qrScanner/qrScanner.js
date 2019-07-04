/**
 * @class QrPage
 *
 * The QR Code Scanner page.
 *
 * Exports a singleton instance.
 */
"use strict";

/* global QRScanner */
import Log from "../../resources/Log.js";
import Page from "../../resources/Page.js";

class QrPage extends Page {
    constructor() {
        super("qr-scanner", "lib/pages/qrScanner/qrScanner.html");
    }

    init() {
        this.$("button.cancel").on("click", () => {
            if (window.QRScanner) {
                QRScanner.cancelScan((/* status */) => {});
            } else {
                this.emit("cancel");
            }
        });
        this.resize();
    }

    resize() {
        if (this.$element.width() > this.$element.height()) {
            this.$(".guide-container").addClass("horizontal");
        } else {
            this.$(".guide-container").removeClass("horizontal");
        }
    }

    show() {
        super.show();
        if (window.QRScanner) {
            QRScanner.show();
            this.start();
        } else {
            Log("Error: QRSCanner plugin not found");
        }
    }

    hide() {
        super.hide();
        this.cleanUp();
    }

    // Start scanning
    start() {
        Promise.resolve()
            .then(() => {
                return new Promise((resolve /* , reject */) => {
                    QRScanner.show((status) => {
                        Log("QRScanner status", status);
                        resolve();
                    });
                });
            })
            .then(() => {
                return new Promise((resolve, reject) => {
                    QRScanner.scan((err, text) => {
                        if (err) {
                            if (err.name == "SCAN_CANCELED") {
                                this.emit("cancel");
                                resolve();
                            } else {
                                reject(err);
                            }
                        } else {
                            Log("scan results: ", text);
                            this.emit("scan", text);
                            resolve();
                        }
                    });
                });
            })
            .catch((err) => {
                this.emit("error", err);
            });
    }

    cleanUp() {
        if (window.QRScanner) {
            QRScanner.destroy((status) => {
                Log("Unloading QRScanner", status);
            });
        }
    }
}

var qrPage = new QrPage();
export default qrPage;

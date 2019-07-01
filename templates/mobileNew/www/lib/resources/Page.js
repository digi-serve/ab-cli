/**
 * @class Page
 *
 * Base class for page controllers in the mobile framework.
 * Is an EventEmitter.
 *
 * Emits `show` event when `show()` method is called.
 * Emits `hide` event when `hide()` method is called.
 */
"use strict";

//import $ from 'jquery';
import EventEmitter from "eventemitter2";

var currentPage = null;
var deviceReady = $.Deferred();

document.addEventListener("deviceready", () => {
    deviceReady.resolve();
});

export default class Page extends EventEmitter {
    /**
     * @param {string} pageID
     *      The DOM element ID of the page div
     * @param {string} [template]
     *      Optional path to the template file.
     *      Default is no template.
     * @param {string} [css]
     *      Optional path to the CSS file.
     *      Default is no CSS.
     */
    constructor(pageID, template, css) {
        super({
            wildcard: true
        });

        this.template = template;
        this.css = css;
        this.pageID = pageID;
        this.$element = $("#" + pageID);

        $.when(this.render(), deviceReady).done(() => {
            this.init();
        });
    }

    /**
     * Inserts HTML and CSS into the document
     */
    render() {
        if (this.$element.length == 0) {
            // Create the page div if it does not exist
            this.$element = $(`<div id="${this.pageID}" class="xpage">`);
            $("body").append(this.$element);
        } else if (!this.$element.hasClass("xpage")) {
            this.$element.addClass("xpage");
        }

        this.addCSS(this.css);

        $(window).on("resize", () => {
            //if (this.$element.is(':visible')) { // <-- slower?
            if (this.$element.css("display") != "none") {
                this.resize();
            }
        });

        return this.addHTML(this.template);
    }

    /**
     * Subclasses should override this if they have elements that need to be
     * manually resized.
     */
    resize() {}

    static resize() {
        currentPage && currentPage.resize();
    }

    static setDeviceReady() {
        deviceReady.resolve();
    }

    /**
     * Load a CSS file into the document
     */
    addCSS(cssFilePath) {
        if (cssFilePath) {
            $("<link>")
                .appendTo("head")
                .attr({
                    type: "text/css",
                    rel: "stylesheet",
                    href: cssFilePath
                });
        }
    }

    /**
     * Add HTML from a template into the page element
     * @param {string} templateFilePath
     * @return {Deferred}
     */
    addHTML(templateFilePath) {
        var dfd = $.Deferred();

        if (!templateFilePath) dfd.resolve();
        else {
            $.get(templateFilePath)
                .fail((err) => {
                    console.log(err);
                    dfd.reject(err);
                })
                .done((html) => {
                    this.$element.html(html);
                    dfd.resolve();
                });
        }

        return dfd;
    }

    /**
     * Subclasses should override this to set up event handling of
     * their page's DOM elements.
     */
    init() {}

    /**
     * Hide this page
     */
    hide() {
        this.$element.hide();
        this.emit("hide");
    }

    /**
     * Show this page and hide all the others.
     */
    show() {
        $("body > div.xpage").hide();
        this.$element.show();
        $("body").scrollTop(0);
        currentPage = this;
        this.emit("show");
    }

    /**
     * Shortcut for this.$element.find()
     */
    $(pattern) {
        if (!this.$element) {
            throw new Error("DOM element not initialized yet");
        }
        return this.$element.find(pattern);
    }
}

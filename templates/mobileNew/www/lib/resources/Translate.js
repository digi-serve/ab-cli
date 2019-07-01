/**
 * @class Translate
 *
 * Manages language translation.
 *
 * Any text within an HTML element with a 'translate' attirbute will be
 * translated. For example:
 *    <div><span translate=1>Hello world</span></div>
 *
 * Text within <T> tags will likewise be translated:
 *    <h2><t>Hello world</t></h2>
 *
 * Placeholder text will be also be translated:
 *    <input placeholder="Enter your name">
 *
 * Translations are read from "/translations/<langCode>.json", where langCode
 * is the 2-letter language code such as 'en' or 'zh'.
 */
"use strict";

var needsTranslation = [];
var loggingEnabled = false; // set to true to see if you missed any text

import EventEmitter from "eventemitter2";
import analytics from "./Analytics.js";

class Translate extends EventEmitter {
    constructor() {
        super();
        this.langCode = "en";
        this.counter = 2;
        this.data = {
            /*
            <original text>: <translated text>,
            "hello world": "Hello World!",
            ...
        */
        };
        this.dataReady = $.Deferred();

        // React whenever new elements are added to the DOM tree
        try {
            this.observer = new MutationObserver((mutationList) => {
                var nodes = [];

                for (var i = 0; i < mutationList.length; i++) {
                    var mutation = mutationList[i];
                    if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                        for (var j = 0; j < mutation.addedNodes.length; j++) {
                            nodes.push(mutation.addedNodes[j]);
                        }
                    }
                }

                if (nodes.length > 0) {
                    this.translateDOM(nodes);
                }
            });
            this.observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        } catch (err) {
            console.log(err);
            alert(
                "Error initializing the translation system:\n" +
                    (err.message || "") +
                    "\n" +
                    (err.stack || "")
            );
            analytics.logError(err);
        }

        window.onlanguagechange = () => {
            this.counter += 1;
            this.dataReady = $.Deferred();
            this.loadData();
            this.translateDOM();
        };

        this.loadData();
        this.translateDOM();
    }

    loadData(langCode = null) {
        if (langCode) {
            this.langCode = langCode;
        } else if (navigator.languages && navigator.languages[0]) {
            this.langCode = navigator.languages[0];
        } else {
            this.langCode = navigator.language || this.langCode;
        }
        this.langCode = String(this.langCode).substring(0, 2);

        // Show Chinese in place of Korean
        if (this.langCode == "ko") {
            this.langCode = "zh";
        }

        // Set lang attribute on document body for CSS language targetting
        $(document.body).attr("lang", this.langCode);

        $.ajax({
            url: "languages/" + this.langCode + ".json",
            dataType: "json"
        })
            .done((data /*, status, xhr */) => {
                this.data = data;
                this.dataReady.resolve();
            })
            .fail((xhr, status, err) => {
                console.log(err);
                analytics.logError("Unsupported language: " + this.langCode);

                // Data file not found/recognized. Language not supported?
                // Leave text untranslated.

                //this.dataReady.resolve();

                // Fall back on English language
                if (this.langCode != "en") {
                    this.loadData("en");
                }
            });

        return this.dataReady;
    }

    t(text) {
        text = text.trim().replace(/\s+/g, " ");
        var translated = this.data[text];

        // Keep track of untranslated text
        if (!translated) {
            if (loggingEnabled && needsTranslation.indexOf(text) < 0) {
                needsTranslation.push(text);
                console.log("Translation needed:", needsTranslation);
            }
            translated = text;
        }

        return translated;
    }

    /**
     * @param {Array/HTMLElement} [target]
     *      Optional target(s) to translate. Default is to translate the whole
     *      document.
     */
    translateDOM(target = null) {
        this.dataReady.done(() => {
            var self = this;
            var $nodes;

            if (target === null) {
                $nodes = $(document);
            } else {
                $nodes = $(target);
            }

            $nodes.find("t,[translate]").each(function() {
                var $node = $(this);
                var text = this.innerHTML;
                var counter = $node.attr("translate") || 0;

                if (counter < self.counter) {
                    if ($node.is("[original-text]")) {
                        text = $node.attr("original-text");
                    } else {
                        $node.attr("original-text", text);
                    }
                    $node.html(self.t(text));
                    $node.attr("translate", self.counter);
                }
            });

            $nodes.find("[placeholder]").each(function() {
                var $node = $(this);
                var text = $node.attr("placeholder");
                var counter = $node.attr("translate") || 0;

                if (counter < self.counter) {
                    if ($node.is("[original-text]")) {
                        text = $node.attr("original-text");
                    } else {
                        $node.attr("original-text", text);
                    }
                    $node.attr("placeholder", self.t(text));
                    $node.attr("translate", self.counter);
                }
            });

            $nodes.find(".dialog-button").each(function() {
                var $node = $(this);
                var text = this.innerHTML;
                var counter = $node.attr("translate") || 0;

                if (counter < self.counter) {
                    if ($node.is("[original-text]")) {
                        text = $node.attr("original-text");
                    } else {
                        $node.attr("original-text", text);
                    }
                    $node.html(self.t(text));
                    $node.attr("translate", self.counter);
                }
            });

            // The translations cause the UI shift because of the difference in
            // word widths, we need to trigger a resize as if the window was
            // resized to fix the layout

            //var $$ = Dom7;
            setTimeout(function() {
                $(window).trigger("resize");
            }, 200);
        });
    }
}

var translate = new Translate();
var t = (text) => {
    return translate.t(text);
};

export { Translate, translate, t };

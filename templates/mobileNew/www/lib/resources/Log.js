/**
 * @function Log
 *
 * Extra functionality for console.log().
 */
"use strict";

import EventEmitter from "eventemitter2";
// eslint-disable-next-line no-unused-vars
import { parse, stringify } from "flatted/cjs";
import account from "./Account.js";

var config = require("../config/config.js");

//// Private variables

var _f7app = null;

var _liveDebug = false;
var _remoteDebug = false;
var _remoteDebugCustom = false;
var _remoteDebugURL = null;

var _history = []; // the record of log messages
var _oldConsoleLog = console.log;
var _oldConsoleWarn = console.warn;
var _oldConsoleError = console.error;

/**
 * Wrapper for console.log()
 *
 * When live debugging is enabled either through log.enableDeviceLogging()
 * or log.enableRemoteLogging(), all calls to console.log() will be routed
 * here instead.
 */
export default function log() {
    // Log to actual device console first
    _oldConsoleLog.apply(console, arguments);

    if (_liveDebug) {
        var newMessages = [];

        for (var i = 0; i < arguments.length; i++) {
            if (arguments[i]) {
                var value = arguments[i];
                if (typeof value != "string") {
                    try {
                        value = JSON.stringify(value, null, 4).slice(0, 500);
                    } catch (e) {
                        _oldConsoleLog(
                            "::: .log(): error trying to JSON.stringify() this data:",
                            arguments[i],
                            e
                        );
                        // Use flatted stringify
                        value = stringify(arguments[i], null, 4).slice(0, 500);
                    }
                }
                newMessages.push(value);
                _history.push(value);
                // Log to the UI
                log.emitter.emit("message", value);
            }
        }

        // Log to the remote server
        if (_remoteDebug && account.authToken && _remoteDebugURL) {
            var xhr = new XMLHttpRequest();
            xhr.open("POST", _remoteDebugURL, true);
            xhr.setRequestHeader("Content-type", "application/json");
            if (!_remoteDebugCustom) {
                // Only send the secret authToken if it is the proper
                // server.
                xhr.setRequestHeader("Authorization", account.authToken);
            }
            xhr.send(JSON.stringify({ message: newMessages.join("\n") }));
        }
    }
}

/**
 * The following events may be emitted.
 *
 * 'message': when console.log() is called while liveDebug is active.
 * 'cleared': after log message history has been cleared.
 */
log.emitter = new EventEmitter();

/**
 * Initialize options.
 *
 * @param {Framework7} [options.app]
 *      Set the Framework7 app object to use for creating the dialog boxes.
 */
log.init = function(options = {}) {
    if (options.app instanceof Framework7) {
        _f7app = options.app;
    }
};

/**
 * Display a basic message dialog box.
 * Wrapper for f7app.dialog.alert().
 *
 * @param {string} message
 * @param {string} title
 */
log.alert = function(message, title) {
    if (_f7app) {
        _f7app.dialog.alert(message, title);
    }
    log(title, message);
};

/**
 * Provides access to the log history.
 *
 * @return {array}
 */
log.getHistory = function() {
    return _history;
};

/**
 * @return {object}
 *    {
 *      liveDebug: {boolean},
 *      remoteDebug: {boolean},
 *      remoteDebugCustom: {boolean},
 *      remoteHost: {string},
 *      remotePort: {string}
 *    }
 */
log.getStatus = function() {
    var hostname = "",
        port = "";

    if (_remoteDebugCustom) {
        // Parse the remote URL
        try {
            var url = new URL(_remoteDebugURL);
            hostname = url.hostname;
            port = url.port;
        } catch (e) {
            _remoteDebugCustom = false;
        }
    }

    return {
        liveDebug: _liveDebug,
        remoteDebug: _remoteDebug,
        remoteDebugCustom: _remoteDebugCustom,
        remoteHost: hostname,
        remotePort: port
    };
};

/**
 * Clear the log history.
 */
log.clearHistory = function() {
    _history = [];
    log.emitter.emit("cleared");
};

/**
 * Enable logging to a user viewable area in the app UI.
 */
log.enableDeviceLogging = function() {
    _liveDebug = true;
    _remoteDebug = false;

    console.log = log;
};

/**
 * Enable logging to a remote server.
 *
 * @param {string} [host]
 *      The IP address or host name of the remote server.
 * @param {string} [port]
 *      The port number on the remote server.
 */
log.enableRemoteLogging = function(host = null, port = null) {
    _liveDebug = true;
    _remoteDebug = true;

    console.log = log;

    // Use default public server
    if (!host || host.length == 0) {
        _remoteDebugURL = config.appbuilder.urlRelayServer + "/log";
        _remoteDebugCustom = false;
    }
    // Use custom server (no encryption)
    else {
        _remoteDebugURL = "http://" + host + ":" + (port || 80) + "/log";
        _remoteDebugCustom = true;
    }
};

/**
 * Disable remote logging and revert console.log() to its previous state.
 */
log.disableRemoteLogging = function() {
    _liveDebug = false;
    _remoteDebug = false;

    console.log = _oldConsoleLog;
};

/**
 * expose the console.error() utility.
 */
log.error = function() {
    // Log to actual device console first
    _oldConsoleError.apply(console, arguments);
};

/**
 * expose the console.warn() utility.
 */
log.warn = function() {
    // Log to actual device console first
    _oldConsoleWarn.apply(console, arguments);
};

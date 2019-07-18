/*
 * NetworkRest.js
 * The base Networking class.  This class is responsible for job submissions
 * and outlines the basic Network interface.
 */

/* global navigator Connection */
import account from "./Account";
import analytics from "./Analytics";
import EventEmitter from "eventemitter2";
import Lock from "./Lock";
import Log from "./Log";
import { storage } from "./Storage";
import uuidv4 from "uuid/v4";

var config = require("../config/config.js");

class NetworkRest extends EventEmitter {
    constructor() {
        super({
            wildcard: true,
            newListener: false
        });

        this.baseURL = null;
        this.queueLock = new Lock();
    }

    /**
     * @method init
     * @param {object} options
     * @param {string} options.baseURL
     * @return {Promise}
     */
    init(options) {
        this.baseURL = options.baseURL || config.appbuilder.urlCoreServer;
        return Promise.resolve();
    }

    //
    // Interface API
    //
    /**
     * Network.get(options, jobResponse)
     * perform a GET request back to the AppBuilder server.
     * @param {obj} params the request parameters that need to be executed on
     *              the AppBuilder Server
     * @param {obj} jobResponse the callback info for handling the response.
     *              {
     *                  key:'unique.key',
     *                  context:{ obj data }
     *              }
     * @return {Promise}
     */
    get(params, jobResponse) {
        params.type = params.type || "GET";
        return this._request(params, jobResponse).then((response) => {
            if (jobResponse) {
                this.publishResponse(jobResponse, response);
            }
            return response;
        });
    }

    /**
     * Network.post()
     * perform an AJAX POST request to the AppBuilder server.
     * @param {obj} params the request parameters that need to be executed on
     *              the AppBuilder Server
     * @param {obj} jobResponse the callback info for handling the response.
     *              {
     *                  key:'unique.key',
     *                  context:{ obj data }
     *              }
     * @return {Promise}
     */
    post(params, jobResponse) {
        params.type = params.type || "POST";
        return this._request(params, jobResponse).then((response) => {
            if (jobResponse) {
                this.publishResponse(jobResponse, response);
            }
            return response;
        });
    }

    /**
     * Network.put()
     * perform a PUT request to the AppBuilder server.
     * @param {obj} params the request parameters that need to be executed on
     *              the AppBuilder Server
     * @param {obj} jobResponse the callback info for handling the response.
     *              {
     *                  key:'unique.key',
     *                  context:{ obj data }
     *              }
     * @return {Promise}
     */
    put(params, jobResponse) {
        params.type = params.type || "PUT";
        return this._request(params, jobResponse).then((response) => {
            if (jobResponse) {
                this.publishResponse(jobResponse, response);
            }
            return response;
        });
    }

    /**
     * Network.delete()
     * perform an AJAX DELETE request to the AppBuilder server.
     * @param {obj} params the request parameters that need to be executed on
     *              the AppBuilder Server
     * @param {obj} jobResponse the callback info for handling the response.
     *              {
     *                  key:'unique.key',
     *                  context:{ obj data }
     *              }
     * @return {Promise}
     */
    delete(params, jobResponse) {
        params.type = params.type || "DELETE";
        return this._request(params, jobResponse).then((response) => {
            if (jobResponse) {
                this.publishResponse(jobResponse, response);
            }
            return response;
        });
    }

    ////
    //// Network Utilities
    ////

    /**
     * @method networkStatus
     * return the connection type currently registered with the network
     * plugin.
     * @return {string}
     */
    networkStatus() {
        return navigator.connection.type;
    }

    /**
     * @method isNetworkConnected
     * return true/false if the device is currently connected to the
     * internet.
     * @return {bool}
     */
    isNetworkConnected() {
        // until Cordova plugin is installed and working:
        if (typeof Connection == "undefined") {
            return true;
        }

        return this.networkStatus() != Connection.NONE;
    }

    /**
     * _request()
     * perform the actual AJAX request for this operation.
     * @param {obj} params  the jQuery.ajax() formatted params
     * @param {obj} jobRequest  the information about the request's response.
     * @return {Promise}
     */
    _request(params, jobResponse) {
        return new Promise((resolve, reject) => {
            params.url = params.url || "/";
            if (params.url[0] == "/") {
                params.url = this.baseURL + params.url;
            }

            params.headers = params.headers || {};
            params.headers.Authorization = account.authToken;

            // params.timeout = params.timeout || 6000;

            if (this.isNetworkConnected()) {
                // setup our error handler
                params.error = (jqXHR, text, err) => {
                    // failing here is probably a problem with the physical
                    // connection to the machine, or bad route.

                    // if this is a network connection error, send the attempt again:
                    if (text == "timeout" || jqXHR.readyState == 0) {
                        //// Network Error: conneciton refused, access denied, etc...
                        Log(
                            "*** NetworkRest._request():network connection error detected. Trying again"
                        );
                        analytics.log(
                            "NetworkRest._request():network connection error detected. Trying again"
                        );
                        // retry the attempt:
                        this._request(params)
                            .then((data) => {
                                // console.log('--- timeout.then():',data);
                                Log.warn(
                                    "*** NetworkRest._request().then(): attempt resolved."
                                );
                                resolve(data);
                            })
                            .catch((err) => {
                                Log.error(
                                    "*** NetworkRest._request().catch(): retry failed:",
                                    err
                                );
                                reject(err);
                            });

                        return;
                    } else if (jqXHR.readyState == 4) {
                        //// an HTTP error
                        Log("HTTP error while communicating with relay server");
                        Log("status code: " + jqXHR.status);

                        if (jqXHR.status == 403) {
                            this.emit("error.badAuth", err);
                        } else if (jqXHR.status >= 400 && jqXHR.status < 500) {
                            this.emit("error.badRequest", err);
                        } else if (jqXHR.status >= 500) {
                            this.emit("error.badServer", err);
                        }
                    }

                    // unknown error here:
                    var error = new Error(
                        "NetworkRest._request() error with .ajax() command:"
                    );
                    error.response = jqXHR.responseText;
                    error.text = text;
                    error.err = err;
                    analytics.logError(error);
                    Log.error(error);
                    // TODO: insert some default error handling for expected
                    // situations:
                    reject(error);
                };

                $.ajax(params).done((packet) => {
                    // Log('--- .done():', packet);
                    // the returned data packet should look like:
                    // {
                    //  status:'success',
                    //  data:{returned Data here}
                    // }
                    // we just want to return the .data portion
                    var data = packet;
                    if (data.data) data = data.data;

                    resolve(data);
                });
            } else {
                // now Queue this request params.
                analytics.log(
                    "NetworkRest:_request(): Network is offline. Queuing request."
                );
                this.queue(params, jobResponse)
                    .then(() => {
                        resolve({ status: "queued" });
                    })
                    .catch(reject);
            }
        });
    }

    /**
     * _resend()
     * processes messages that were queued due to network connectivity
     * issues.
     * @param {obj} params  the jQuery.ajax() formatted params
     * @param {obj} jobRequest  the information about the request's response.
     * @return {Promise}
     */
    _resend(params, jobResponse) {
        var op = params.type.toLowerCase();
        return this[op](params, jobResponse);
    }

    /**
     * publishResponse()
     * emit the requested response for this network operation.
     * @param {obj} jobResponse
     * @param {obj} data
     */
    publishResponse(jobResponse, data) {
        this.emit(jobResponse.key, jobResponse.context, data);
    }

    ////
    //// Queued Requests
    ////

    /**
     * refQueue()
     * sub classes can override this for their own separate Queue Data
     * @return {string}
     */
    refQueue() {
        return "networkQueue";
    }

    /**
     * Adds a request to the outgoing queue.
     *
     * @param {object} data
     * @param {object} jobResponse
     * @return {Promise}
     */
    queue(data, jobResponse) {
        var refQueue = this.refQueue();

        return new Promise((resolve, reject) => {
            this.queueLock
                .acquire()
                .then(() => {
                    return storage.get(refQueue);
                })
                .then((queue) => {
                    queue = queue || [];
                    queue.push({ data, jobResponse });
                    Log(
                        `:::: ${queue.length} request${
                            queue.length > 1 ? "s" : ""
                        } queued`
                    );
                    return storage.set(refQueue, queue);
                })
                .then(() => {
                    this.emit("queued");
                    this.queueLock.release();
                    resolve();
                })
                .catch((err) => {
                    Log.error("Error while queueing data", err);
                    analytics.logError(err);
                    reject(err);

                    this.queueLock.release();
                });
        });
    }

    /**
     * queueFlush()
     * Flush the queue and send the contents to the relay server.
     */
    queueFlush() {
        var refQueue = this.refQueue();

        // if we are not connected, then stop
        if (!this.isNetworkConnected()) {
            var error = new Error("Not connected to the internet.");
            error.code = "E_NOTCONNECTED";
            return Promise.reject(error);
        }

        // otherwise, attempt to flush the queue:
        return new Promise((resolve, reject) => {
            this.queueLock
                .acquire()

                //
                // Get queue contents
                //
                .then(() => {
                    return storage.get(refQueue);
                })

                //
                // Send off each queued request
                //
                .then((queue) => {
                    // default to [] if not found
                    queue = queue || [];

                    // recursively process each pending queue request
                    var processRequest = (cb) => {
                        if (queue.length == 0) {
                            cb();
                        } else {
                            var entry = queue.shift();
                            var params = entry.data;
                            var job = entry.jobResponse;
                            this._resend(params, job)
                                .then(() => {
                                    processRequest(cb);
                                })
                                .catch(cb);
                        }
                    };

                    return new Promise((res, rej) => {
                        processRequest((err) => {
                            if (err) {
                                rej(err);
                            } else {
                                res();
                            }
                        });
                    });
                })

                //
                // Clear queue contents
                //
                .then(() => {
                    return storage.set(refQueue, []);
                })

                // release the Lock
                .then(() => {
                    // this.emit('synced');
                    return this.queueLock.release();
                })

                // all done.
                .then(() => {
                    resolve();
                })

                // respond to errors:
                .catch((err) => {
                    Log.error("commAPI queueFlush error", err);
                    analytics.logError(err);

                    this.queueLock.release().then(() => {
                        reject(err);
                    });
                });
        });
    }

    /**
     * Reset credentials to a blank state.
     *
     * @return {Promise}
     */
    reset() {
        return Promise.resolve();
    }

    uuid() {
        return uuidv4();
    }

    getTokens() {
        // called in appPage.js : openRelayLoader()
        return {};
    }
}

export default NetworkRest;

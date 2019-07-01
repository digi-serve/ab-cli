/**
 * @class Lock
 * Simple mutex lock based on Promises.
 *
 * After a lock is first acquired, further attempts to acquire it again will
 * be queued until it is released.
 *
 * Example:
 *      var lock = new Lock();
 *      lock.acquire()
 *      .then(() => {
 *          // do stuff
 *          return asyncFunc1();
 *      })
 *      .then(() => {
 *          // do more stuff
 *          return asyncFunc2();
 *      })
 *      .finally(() => {
 *          lock.release();
 *      });
 */
(function(root, factory) {
    /* eslint-disable */
    if (typeof define === "function" && define.amd) {
        // AMD
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        // Node
        module.exports = factory();
    } else {
        // Browser globals
        root.Lock = factory();
    }
    /* eslint-enable */
})(typeof self !== "undefined" ? self : this, function() {
    "use strict";

    class Lock {
        constructor() {
            // "Private" properties
            this._promise = null;
            this._resolve = null;
        }

        /**
         * return {Promise}
         */
        acquire() {
            return new Promise((ready) => {
                // Another lock is already pending
                if (this._promise) {
                    // Wait for it to finish
                    this._promise
                        .then(() => {
                            // Acquire fresh lock
                            return this.acquire();
                        })
                        .then(() => {
                            ready();
                        });
                }
                // Nothing is pending.
                else {
                    this._promise = new Promise((_resolve) => {
                        this._resolve = _resolve;
                    });
                    ready();
                }
            });
        }

        release() {
            if (this._promise) {
                this._promise = null;
                this._resolve();
            } else {
                throw new Error("Attempt to release invalid lock");
            }
        }
    }

    return Lock;
});

import whilst from "async/whilst";
import CryptoJS from "crypto-js";

// Shortcuts
var C = CryptoJS;
var C_lib = C.lib;
var Base = C_lib.Base;
var WordArray = C_lib.WordArray;
var C_algo = C.algo;
var SHA1 = C_algo.SHA1;
var HMAC = C_algo.HMAC;

/**
 * Async Password-Based Key Derivation Function 2 algorithm.
 */
var PBKDF2 = (C_algo.PBKDF2async = Base.extend({
    /**
     * Configuration options.
     *
     * @property {number} keySize The key size in words to generate. Default: 4 (128 bits)
     * @property {Hasher} hasher The hasher to use. Default: SHA1
     * @property {number} iterations The number of iterations to perform. Default: 1
     * @property {string} 'async' is slow, 'sync' is fast but blocks UI, 'semi' is mixed
     */
    cfg: Base.extend({
        keySize: 128 / 32,
        hasher: SHA1,
        iterations: 1,
        iterationMode: "semi",
        semiCount: 100
    }),

    /**
     * Initializes a newly created key derivation function.
     *
     * @param {Object} cfg (Optional) The configuration options to use for the derivation.
     *
     * @example
     *
     *     var kdf = CryptoJS.algo.PBKDF2.create();
     *     var kdf = CryptoJS.algo.PBKDF2.create({ keySize: 8 });
     *     var kdf = CryptoJS.algo.PBKDF2.create({ keySize: 8, iterations: 1000 });
     */
    init: function(cfg) {
        this.cfg = this.cfg.extend(cfg);
    },

    /**
     * Computes the Password-Based Key Derivation Function 2.
     *
     * @param {WordArray|string} password The password.
     * @param {WordArray|string} salt A salt.
     *
     * @return {Promise}
     *     {WordArray} The derived key.
     *
     * @example
     *
     *     kdf.compute(password, salt).then((key) => {
     *         console.log(key);
     *     };
     */
    compute: function(password, salt) {
        // Shortcut
        var cfg = this.cfg;

        // Init HMAC
        var hmac = HMAC.create(cfg.hasher, password);

        // Initial values
        var derivedKey = WordArray.create();
        var blockIndex = WordArray.create([0x00000001]);

        // Shortcuts
        var derivedKeyWords = derivedKey.words;
        var blockIndexWords = blockIndex.words;
        var keySize = cfg.keySize;
        var iterations = cfg.iterations;

        // Generate key
        return new Promise((resolve, reject) => {
            whilst(
                () => {
                    return derivedKeyWords.length < keySize;
                },
                (next) => {
                    var block = hmac.update(salt).finalize(blockIndex);
                    var intermediate = block;
                    hmac.reset();

                    // Shortcuts
                    var blockWords = block.words;
                    var blockWordsLength = blockWords.length;

                    if (cfg.iterationMode == "sync") {
                        // Synchronous Iterations
                        for (var i = 1; i < iterations; i++) {
                            intermediate = hmac.finalize(intermediate);
                            hmac.reset();

                            // Shortcut
                            var intermediateWords = intermediate.words;

                            // XOR intermediate with block
                            for (var j = 0; j < blockWordsLength; j++) {
                                blockWords[j] ^= intermediateWords[j];
                            }
                        }

                        derivedKey.concat(block);
                        blockIndexWords[0]++;
                        setTimeout(next, 0);
                    } else if (cfg.iterationMode == "semi") {
                        // Semi Async Iterations
                        var i2 = 1;
                        whilst(
                            () => {
                                return i2 < iterations;
                            },
                            (cb) => {
                                for (
                                    var k = 0;
                                    k < cfg.semiCount && i2 < iterations;
                                    k++, i2++
                                ) {
                                    intermediate = hmac.finalize(intermediate);
                                    hmac.reset();

                                    // Shortcut
                                    var intermediateWords = intermediate.words;

                                    // XOR intermediate with block
                                    for (var j = 0; j < blockWordsLength; j++) {
                                        blockWords[j] ^= intermediateWords[j];
                                    }
                                }

                                setTimeout(cb, 0);
                            },
                            (err) => {
                                if (err) next(err);
                                else {
                                    derivedKey.concat(block);
                                    blockIndexWords[0]++;
                                    setTimeout(next, 0);
                                }
                            }
                        );
                    } else {
                        // Fully Async Iterations
                        var i3 = 1;
                        whilst(
                            () => {
                                return i3 < iterations;
                            },
                            (cb) => {
                                intermediate = hmac.finalize(intermediate);
                                hmac.reset();

                                // Shortcut
                                var intermediateWords = intermediate.words;

                                // XOR intermediate with block
                                for (var j = 0; j < blockWordsLength; j++) {
                                    blockWords[j] ^= intermediateWords[j];
                                }

                                i3++;
                                setTimeout(cb, 0);
                            },
                            (err) => {
                                if (err) next(err);
                                else {
                                    derivedKey.concat(block);
                                    blockIndexWords[0]++;
                                    setTimeout(next, 0);
                                }
                            }
                        );
                    }
                },
                (err) => {
                    if (err) reject(err);
                    else {
                        derivedKey.sigBytes = keySize * 4;
                        resolve(derivedKey);
                    }
                }
            );
        });
    }
}));

/**
 * Computes the Password-Based Key Derivation Function 2.
 *
 * @param {WordArray|string} password The password.
 * @param {WordArray|string} salt A salt.
 * @param {Object} cfg (Optional) The configuration options to use for this computation.
 *
 * @return {Promise}
 *     {WordArray} The derived key.
 *
 * @static
 *
 * @example
 *
 *     var key = CryptoJS.PBKDF2(password, salt);
 *     var key = CryptoJS.PBKDF2(password, salt, { keySize: 8 });
 *     var key = CryptoJS.PBKDF2(password, salt, { keySize: 8, iterations: 1000 });
 */
C.PBKDF2async = function(password, salt, cfg) {
    if (window.Worker) {
        // Synchronously calculate result in a separate thread
        return new Promise((resolve, reject) => {
            var pbkdf2Worker = new Worker("js/pbkdf2-worker-bundle.js");
            pbkdf2Worker.onmessage = function(e) {
                var key = C.enc.Hex.parse(e.data);
                resolve(key);
            };
            pbkdf2Worker.onerror = function(err) {
                reject(err);
            };
            pbkdf2Worker.postMessage([password, salt, cfg]);
        });
    } else {
        // Asynchronously calculate result in the same thread
        return PBKDF2.create(cfg).compute(password, salt);
    }
};

export default C.PBKDF2async;

/**
 * @function cryptoHash
 * return a random hash to use as a SALT in our password encryption.
 * @return {string}
 */
const crypto = require("crypto");

module.exports = function() {
   return crypto.randomBytes(32).toString("hex");
};

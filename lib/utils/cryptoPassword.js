/**
 * @function cryptoPassword
 * Generate a password hash from its plaintext value and salt.
 * The hash algorithm is intentionally slow in order to thwart brute force
 * password cracking.
 *
 * @param string password
 * @param string salt
 * @return {Promise}
 *      Resolves with the hashed password string, 1024 characters in length
 */
const crypto = require("crypto");

module.exports = function(password, salt) {
   return new Promise((resolve, reject) => {
      if (salt == null) {
         var err = new Error("salt cannot be null");
         reject(err);
      } else {
         crypto.pbkdf2(password, salt, 100000, 512, "sha1", function(err, key) {
            if (err) {
               reject(err);
            } else {
               resolve(key.toString("hex"));
            }
         });
      }
   });
};

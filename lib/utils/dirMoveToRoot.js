/**
 * @dirMoveToRoot
 *
 * change to the root directory (the ab_runtime directory).
 *
 * @return {bool}  did we find and move to the root directory?
 */

var path = require("path");
var dirLooksLikeRoot = require(path.join(__dirname, "dirLooksLikeRoot"));

module.exports = function () {
   var numAttempts = 0;
   var numAttemptLimit = 20;

   var currPath = process.cwd();

   while (!dirLooksLikeRoot(currPath) && numAttempts < numAttemptLimit) {
      currPath = path.resolve(path.join(currPath, ".."));
      numAttempts++;
   }

   if (numAttempts < numAttemptLimit) {
      process.chdir(currPath);
      return true;
   }

   return false;
};

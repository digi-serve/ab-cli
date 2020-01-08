/**
 * @dirLooksLike
 *
 * returns true if current path looks like the given checks description.
 * returns false otherwise.
 *
 * @param {object} checks   the description of the directory
 *                          {
 *                              fileName:1, // fileName exists in directory
 *                              dirName:0   // dirName !exists in directory
 *                          }
 * @param {string} currPath the path to examine
 * @return {bool}  does the current directory pass all checks.
 */

var fs = require("fs");
var path = require("path");

module.exports = function(checks, currPath) {
   var isDir = true;

   for (var k in checks) {
      var check = path.join(currPath, k);
      //console.log('  .check:'+check);
      if (checks[k]) {
         // this is supposed to be here
         if (!fs.existsSync(check)) {
            isDir = false;
         }
      } else {
         // this is not supposed to be here
         if (fs.existsSync(check)) {
            isDir = false;
         }
      }
   }

   //console.log('  .isRoot = '+isRoot);

   return isDir;
};

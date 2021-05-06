/**
 * findAllServices
 * Pull out all the services in the developer/ directory.
 * ignoring our non service directories.
 * @return {array} array of the directory names
 */
var fs = require("fs");
var path = require("path");

module.exports = function () {
   var ignoreDirectories = ["api_sails", "ab_platform_web"];
   var allServices = [];
   var devDir = path.join(process.cwd(), "developer");
   var entries = fs.readdirSync(devDir);
   entries.forEach((e) => {
      // don't list the api_sails service.
      if (ignoreDirectories.indexOf(e) > -1) {
         return;
      }
      var stats = fs.statSync(path.join(devDir, e));
      if (stats.isDirectory()) {
         allServices.push(e);
      }
   });
   return allServices;
}; // end module.exports = fn()

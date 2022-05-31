/**
 * @function gitCheckout
 * checkout a git project into a provided directory
 * @param {string} pathDir path to the directory
 * @param {string} urlProject  the git project https://url to checkout
 * @param {string} nameInstallDir the name of the local directory to create.
 * @param {fn} cb node style callback when this is finished.
 */
var fs = require("fs");
var path = require("path");
// var execCommand = require(path.join(__dirname, "execCommand"));

module.exports = function (cb) {
   var allServices = [];

   try {
      // scan the docker-compose.dev.yml file for links to our local development
      var contents = fs
         .readFileSync(path.join(process.cwd(), "docker-compose.dev.yml"))
         .toString();

      var serviceExp = new RegExp("source.*developer/(.*)", "g");
      var service;
      while ((service = serviceExp.exec(contents))) {
         if (service[1].includes("/")) {
            service[1] = service[1].split("/")[0];
         }
         allServices.push(service[1]);
      }
   } catch (e) {
      cb(e);
      return;
   }

   cb(null, allServices);
};

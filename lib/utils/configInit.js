/**
 * @function configInit
 * start up docker with a config initialization stack.
 * @param {hash} Options
 *        the working hash of Option values provided by the calling routine.
 *        Options.stash {string}
 *          the docker stack reference we are using for this install.
 * @param {string} dbinitFileName
 *        the name of the docker compose file to use for initializing the
 *        databases.
 * @return {Promise}
 */
const path = require("path");
const dockerStackWatch = require(path.join(__dirname, "dockerStackWatch.js"));

function ProcessData(context, data) {
   data = data.toString();

   // this is helpful to know if mysql is up and running the 1st time
   if (data.indexOf("copying: ") > -1) {
      context.readyFound = true;
   }

   if (context.readyFound) {
      if (data.indexOf("... config preparation complete") > -1) {
         console.log("... init complete");
         context.endTrigger.emit("done");
      }
   }
}

module.exports = function (Options, configInitFileName = "config-compose.yml") {
   return dockerStackWatch(Options, ProcessData, configInitFileName).then(
      () => {
         console.log("... config initialized. ");
      }
   );
};

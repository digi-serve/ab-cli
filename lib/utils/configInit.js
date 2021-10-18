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
const async = require("async");
const path = require("path");
var shell = require("shelljs");
const dockerStackWatch = require(path.join(__dirname, "dockerStackWatch.js"));

function ProcessData(context, data) {
   data = data.toString();

   // this is helpful to know if mysql is up and running the 1st time
   if (data.indexOf("copying: ") > -1) {
      context.readyFound = true;
   }

   if (context.readyFound) {
      if (data.indexOf("... config preparation complete") > -1) {
         console.log("... init complete (config)");
         try {
            context.endTrigger.emit("done");
         } catch(e) {
            console.log(e);
         }
      }
   }
}

module.exports = function (Options, configInitFileName = "config-compose.yml") {
   return new Promise((resolve, reject) => {
      async.series(
         [
            (next) => {
               if (!Options.nginxEnable) {
                  return next();
               }

               // pull up a quick docker nginx container to populate the
               // nginx_etc volume
               /* [18 Oct 21] removed ' > /dev/null' as it caused an error:
               *   'The system cannot find the path specified.'
               *   so the nginx_etc volume wasn't getting created
               */
               shell.exec(
                  `docker run -v ${
                     Options.stack || "ab"
                  }_nginx_etc:/etc nginx ls`,
                  { silent: true }
               );
               next();
            },
            (next) => {
               dockerStackWatch(Options, ProcessData, configInitFileName)
                  .then(() => {
                     next();
                  })
                  .catch(next);
            },
         ],
         (err) => {
            if (err) {
               return reject(err);
            }
            resolve();
         }
      );
   });
};

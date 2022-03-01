/**
 * @function dbInit
 * start up docker with a simple db initialization routine to create the
 * initial DB tables.
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
const async = require("async");
const EventEmitter = require("events");
const execCommand = require(path.join(__dirname, "execCommand.js"));
const os = require("os");
const shelljs = require("shelljs");

var idCheck = null;
const intervalCheck = 15 * 1000; // 15 sec
// {int}
// the time in ms to wait between checks.

function check(context, done, count) {
   var nextCount = count;
   if (context.readyFound) {
      if (count > 3) {
         console.log(
            "... looks like mariadb didn't need to init the DB. Maybe dir already has been initialized?"
         );
         done();
         return;
      }
      nextCount = count + 1;
   }

   idCheck = setTimeout(() => {
      check(context, done, nextCount);
   }, intervalCheck);
}

function ProcessData(context, data) {
   data = data.toString();

   // this is helpful to know if mysql is up and running the 1st time
   if (data.indexOf("mysqld: ready for connections.") > -1) {
      context.readyFound = true;
   }

   if (!context.initBegan) {
      if (data.indexOf("initdb.d/01-CreateDBs.sql") > -1) {
         context.initBegan = true;
         console.log("... initializing tables");
      }
   } else {
      if (data.indexOf("mysqld: ready for connections.") > -1) {
         console.log("... init complete");
         context.endTrigger.emit("done");
      }
   }
}

module.exports = function (Options, dbinitFileName = "dbinit-compose.yml") {
   var context = {
      readyFound: false,
      initBegan: false,
      endTrigger: new EventEmitter(),
   };

   var stack = Options.stack || "ab";

   return new Promise((resolve, reject) => {
      async.series(
         [
            (done) => {
               // be sure there are no other ab stacks running:
               console.log(`... clearing out existing ${stack} stacks`);
               shelljs.exec(`docker stack rm ${stack}`, { silent: true });
               done();
            },

            (done) => {
               // create a docker process for initializing the DB
               console.log("... booting up mysql");
               var tryIt = () => {
                  var response = shelljs.exec(
                     `docker stack deploy -c ${dbinitFileName} ${stack}`,
                     {
                        silent: true,
                     }
                  );
                  if (response.code == 0) {
                     done();
                  } else {
                     if (
                        response.stderr.indexOf(
                           `network ${stack}_default not found`
                        ) != -1
                     ) {
                        // gotta wait for the network to be usable again after
                        // the 'docker stack rm' operation.
                        console.log(
                           "    --> network unavailable, retrying ... "
                        );
                        setTimeout(tryIt, 1000);
                     } else {
                        // some other error:
                        console.log(response.stderr);
                        var deployError = new Error(response.stderr);
                        done(deployError);
                     }
                  }
               };

               tryIt();
            },

            (done) => {
               // watch the log entries
               console.log("... watching log entries");

               idCheck = setTimeout(() => {
                  check(context, done, 1);
               }, intervalCheck);

               var command = path.join(process.cwd(), "logs.js");
               var options = [];
               if (os.platform() == "win32") {
                  options.push(command);
                  command = "node";
               }

               execCommand({
                  command,
                  options,
                  shouldEcho: false,
                  onData: (data) => {
                     ProcessData(context, data);
                  },
                  outputOnStdErr: true,
               }).catch((err) => {
                  console.error(err);
                  done(err);
               });

               // once we receive our final "ready for connections"
               context.endTrigger.on("done", () => {
                  done();
               });
            },

            (done) => {
               // shut everything down
               clearTimeout(idCheck);
               console.log("... shutting down");
               shelljs.exec(`docker stack rm ${stack}`, { silent: true });
               done();
            },
         ],
         (err) => {
            if (err) {
               reject(err);
               return;
            }
            console.log();
            console.log("... db initialized. ");
            console.log();
            resolve();
         }
      );
   });
};

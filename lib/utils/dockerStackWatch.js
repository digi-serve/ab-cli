/**
 * @function dockerStackWatch
 * start up docker with a compose file, and then watch the logs.
 * @param {hash} Options
 *        the working hash of Option values provided by the calling routine.
 *        Options.stack {string}
 *          the docker stack reference we are using for this run.
 *        Options.keepRunning {boolean}
 *          {true}  leave the docker stack running
 *          {false} pull the docker stack down after we are complete.
 * @param {fn} ProcessData
 *        A provided function by the calling routine to scan the current inputs
 *        and determine if the stack is operating as expected.
 *        ProcessData will be privided 2 inputs (context, data)
 *        context {obj} A data structure for determining the progress of the stack
 *          .readyFound {bool} a flag that indicates the stack has properly started
 *                             operation.
 *          .endTrigger {EventEmitter} is used to signal when the stack is finished.
 *             .endTrigger.emit("done") will signal us to then close down the stack
 *             and move along.
 * @param {string} composeFileName
 *        the name of the docker compose file to use for initializing the
 *        stack.
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
         console.log("... looks like our stack didn't run as expected. ");
         done();
         return;
      }
      nextCount = count + 1;
   }

   idCheck = setTimeout(() => {
      check(context, done, nextCount);
   }, intervalCheck);
}

module.exports = function (
   Options,
   ProcessData,
   composeFileName = "dbinit-compose.yml"
) {
   var context = {
      readyFound: false,
      // {bool} has the stack begun it's operation as expected?
      initBegan: false,
      endTrigger: new EventEmitter(),
      // {EventEmitter} used to signal when the stack has completed it's operation.
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
               console.log(`... booting up ${composeFileName}`);
               var tryIt = () => {
                  // use config to resolve any .env variables into a usable config
                  shelljs.exec(
                     `docker-compose -f ${composeFileName} config > delme.yml`,
                     {
                        silent: true,
                     }
                  );
                  var response;
                  if (process.arch == "arm64") {
                     // for Apple M1 chip, use docker-compose instead.
                     // 1 June 2023: getting an error when running our ab-db container:
                     // no suitable node (unsupported platform on 1 node)
                     response = shelljs.exec(
                        `docker-compose -d -f delme.yml up`,
                        {
                           // silent: true,
                        }
                     );
                  } else {
                     response = shelljs.exec(
                        `docker stack deploy -c delme.yml ${stack}`,
                        {
                           silent: true,
                        }
                     );
                  }
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
               if (!Options.keepRunning) {
                  // shut everything down
                  clearTimeout(idCheck);
                  console.log("... shutting down");
                  shelljs.exec(`docker stack rm ${stack}`, { silent: true });
               }
               done();
            },
         ],
         (err) => {
            if (err) {
               reject(err);
               return;
            }

            resolve();
         }
      );
   });
};

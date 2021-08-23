//
// testDown
// Bring down our testing environment (stack).
//
// options:
//
//
var async = require("async");
var path = require("path");
var shell = require("shelljs");
var utils = require(path.join(__dirname, "..", "utils", "utils"));

var Options = {}; // the running options for this command.

//
// Build the Install Command
//
var Command = new utils.Resource({
   command: "testDown",
   params: "",
   descriptionShort: "close down our testing environment.",
   descriptionLong: `
`,
});

module.exports = Command;

Command.help = function () {
   console.log(`

  usage: $ appbuilder test down [stack]

  issue the command to bring down our testing stack

  Options:
    [stack] the name of the docker stack we are referencing.

`);
};

Command.run = function (options) {
   return new Promise((resolve, reject) => {
      async.series(
         [
            // copy our passed in options to our Options
            (done) => {
               for (var o in options) {
                  Options[o] = options[o];
               }

               Options.stack = options._.shift();
               if (!Options.stack) {
                  console.log("missing required param: [stack]");
                  Command.help();
                  process.exit(1);
               }
               Options.stack = `test_${Options.stack}`;
               done();
            },
            checkDependencies,
            stackRM,
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

/**
 * @function checkDependencies
 * verify the system has any required dependencies for generating ssl certs.
 * @param {function} done  node style callback(err)
 */
function checkDependencies(done) {
   utils.checkDependencies(["docker"], done);
}

/**
 * @function stackRM
 * issue the command to bring the stack down.
 * @param {function} done  node style callback(err)
 */
function stackRM(done) {
   var response = shell.exec(`docker stack rm ${Options.stack}`, {
      silent: true,
   });
   if (response.stdout != "") {
      // stack is found so:
      Options.needDeploy = false;
   }
   done();
}

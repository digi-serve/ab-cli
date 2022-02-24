//
// test
// manage testing related tasks
//
// options:
//  appbuilder test setup  : create a new test_ab_mysql volume
//  appbuilder test reset  : clear the test_ab_mysql volume to initial values
//
var async = require("async");
var path = require("path");
var utils = require(path.join(__dirname, "utils", "utils"));

// var testReset = require(path.join(__dirname, "tasks", "testReset.js"));
var testDown = require(path.join(__dirname, "tasks", "testDown.js"));
var testSetup = require(path.join(__dirname, "tasks", "testSetup.js"));
var testWaitBoot = require(path.join(__dirname, "tasks", "testWaitBoot.js"));
const addTests = require(path.join(__dirname, "tasks", "addTests.js"));

var Options = {}; // the running options for this command.

//
// Build the Service Command
//
var Command = new utils.Resource({
   command: "test",
   params: "",
   descriptionShort: "manage running unit/e2e tests",
   descriptionLong: `
`,
});

module.exports = Command;

Command.help = function () {
   console.log(`

  usage: $ appbuilder test [operation]

  [operation]s :
    down      : $ appbuilder test down
    reset     : $ appbuilder test reset
    setup     : $ appbuilder test setup
    waitBoot  : $ appbuilder test waitBoot
    add       : $ appbuilder test add

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
               Options.operation = options._.shift();

               // check for valid params:
               if (!Options.operation) {
                  Command.help();
                  process.exit(1);
               }
               done();
            },
            checkDependencies,
            chooseTask,
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
 * verify the system has any required dependencies for service operations.
 * @param {function} done  node style callback(err)
 */
function checkDependencies(done) {
   utils.checkDependencies(["docker"], done);
}

/**
 * @function chooseTask
 * choose the proper subTask to perform.
 * @param {cb(err)} done
 */
function chooseTask(done) {
   var task;
   switch (Options.operation.toLowerCase()) {
      case "down":
         task = testDown;
         break;

      // case "reset":
      //    task = testReset;
      //    break;

      case "setup":
         task = testSetup;
         break;

      case "waitboot":
         task = testWaitBoot;
         break;

      case "add":
         task = addTests;
         break;
   }
   if (!task) {
      Command.help();
      process.exit(1);
   }

   task.run(Options).then(done).catch(done);
}

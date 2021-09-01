//
// tenant
// manage tenant related tasks
//
// options:
//  appbuilder tenant add  : create a new tenant in the system
//  appbuilder tenant rm   : remove a tenant from the system
//
//
var async = require("async");
var path = require("path");
var utils = require(path.join(__dirname, "utils", "utils"));

var tenantAdd = require(path.join(__dirname, "tasks", "tenantAdd.js"));

var Options = {}; // the running options for this command.

//
// Build the Service Command
//
var Command = new utils.Resource({
   command: "tenant",
   params: "",
   descriptionShort: "manage tenants in our system",
   descriptionLong: `
`,
});

module.exports = Command;

Command.help = function () {
   console.log(`

  usage: $ appbuilder tenant [operation]

  [operation]s :
    add      : $ appbuilder tenant add
    rm       : $ appbuilder tenant rm
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
      case "add":
         task = tenantAdd;
         break;
   }
   if (!task) {
      Command.help();
      process.exit(1);
   }

   task.run(Options).then(done).catch(done);
}

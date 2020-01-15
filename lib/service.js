//
// service
// manager service related tasks
//
// options:
//  appbuilder service new [name]  : create a new service
//  appbuilder service debug [name] : enable chrome debugging on a service
//
var async = require("async");
var path = require("path");
var utils = require(path.join(__dirname, "utils", "utils"));

var serviceNew = require(path.join(__dirname, "tasks", "serviceNew.js"));
var serviceHandler = require(path.join(
   __dirname,
   "tasks",
   "serviceHandler.js"
));

var Options = {}; // the running options for this command.

//
// Build the Service Command
//
var Command = new utils.Resource({
   command: "service",
   params: "",
   descriptionShort: "manage your micro services.",
   descriptionLong: `
`
});

module.exports = Command;

Command.help = function() {
   console.log(`

  usage: $ appbuilder service [operation] [options]

  [operation]s :
    new :    $ appbuilder service new [name]
    handler: $ appbuilder service handler [service] [action] [key]
    debug:   $ appbuilder service debug [name]


  [options] :
    name:  the name of the service (without the "ab_service_" prefix )

  examples:

    $ appbuilder service new file_processor
        - creates new service in developer/file_processor
        - include new service in docker-compose.dev.yml

    $ appbuilder service debug file_processor --break
        - patches the developer/file_processor/package.json to --inspect-brk
        - docker-compose.dev.yml : exposes port 9229

`);
};

Command.run = function(options) {
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
            chooseTask
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
   utils.checkDependencies(["git", "docker"], done);
}

/**
 * @function chooseTask
 * choose the proper subTask to perform.
 * @param {cb(err)} done
 */
function chooseTask(done) {
   var task;
   switch (Options.operation.toLowerCase()) {
      case "new":
         task = serviceNew;
         break;

      case "handler":
         task = serviceHandler;
         break;
   }
   if (!task) {
      Command.help();
      process.exit(1);
   }

   task
      .run(Options)
      .then(done)
      .catch(done);
}

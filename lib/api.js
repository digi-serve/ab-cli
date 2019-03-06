//
// api
// manage api related tasks
//
// options:
//  appbuilder api new [name]  : create a new service api
//
var async = require("async");
var path = require("path");
var utils = require(path.join(__dirname, "utils", "utils"));

var apiNew = require(path.join(__dirname, "tasks", "apiNew.js"));

var Options = {}; // the running options for this command.

//
// Build the Service Command
//
var Command = new utils.Resource({
  command: "api",
  params: "",
  descriptionShort: "manage your APIs.",
  descriptionLong: `
`
});

module.exports = Command;

Command.help = function() {
  console.log(`

  usage: $ appbuilder api [operation] [options]

  [operation]s :
    new :   appbuilder api new [service] [action]


  [options] :
    service:  the name of the service (without the "ab_service_" prefix )
    action:   the name of the api action

    --serviceHandler : create a new service handler to match this api
    --verb [get,put,post,delete,all] : the HTTP verb to listen for
    --route [route/:with/params] : the route to referece this api

  examples:

    $ appbuilder api new file_processor delete
        - creates new api_sails route:
          -- action: api_sails/api/controllers/file_processor/delete.js
          -- route: get /file_processor/delete

    $ appbuilder api new image_processor scale --serviceHandler
        - creates new api_sails route:
          -- action: api_sails/api/controllers/image_processor/scale.js
          -- route: get /image_processor/scale
        - create a new service handler:
          -- handler: image_processor/src/scale.js

`);
};

Command.run = function(options) {
  return new Promise((resolve, reject) => {
    async.series(
      [
        // copy our passed in options to our Options
        done => {
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
        moveToRoot,
        chooseTask
      ],
      err => {
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
  utils.checkDependencies([], done);
}

/**
 * @function moveToRoot
 * these commands should operate from the [root] directory.
 * @param {function} done  node style callback(err)
 */
function moveToRoot(done) {
  if (utils.dirMoveToRoot()) {
    done();
    return;
  }

  console.log(`

!! Unable to move to ab_runtime root directory.

This command is intended to be run withing a developer's installation of the
ab_runtime.

`);
  done(new Error("Not Found."));
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
      task = apiNew;
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

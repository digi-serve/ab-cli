//
// mobile
// manage mobile app development tasks
//
// options:
//  appbuilder mobile new [name]  : create a new mobile app project
//
var async = require("async");
var path = require("path");
var utils = require(path.join(__dirname, "utils", "utils"));

var mobileNew = require(path.join(__dirname, "tasks", "mobileNew.js"));

var Options = {}; // the running options for this command.

//
// Build the Service Command
//
var Command = new utils.Resource({
    command: "mobile",
    params: "",
    descriptionShort: "manage your Mobile projects.",
    descriptionLong: `
`
});

module.exports = Command;

Command.help = function() {
    console.log(`

  usage: $ appbuilder mobile [operation] [options]

  [operation]s :
    new :   appbuilder mobile new [appName] [--dest /path/to/directory]


  [options] :
    appName:  the name of the mobile app
              (will become the directory it is stored in )

    --dest  : (optional) path to the directory to install in
              [default] = current dir

  examples:

    $ appbuilder mobile new HRProfile
        - creates directory [currentDir]/HRProfile

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
    // NOTE: we most likely don't put any dependency checking here,
    // it is usually done in the task: mobileNew, ...
    utils.checkDependencies([], done);
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
            task = mobileNew;
            break;
    }
    if (!task) {
        Command.help();
        process.exit(1);
    }

    task.run(Options)
        .then(done)
        .catch(done);
}

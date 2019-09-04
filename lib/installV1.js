//
// installV1
// perform a new installation of the previous AB Runtime.
//
// options:
//  --developer   :  setup the environment for a developer
//
var async = require("async");
var fs = require("fs");
var path = require("path");
var shell = require("shelljs");
var utils = require(path.join(__dirname, "utils", "utils"));
var Setup = require(path.join(__dirname, "setup.js"));

var Options = {}; // the running options for this command.

//
// Build the Install Command
//
var Command = new utils.Resource({
    command: "installV1",
    params: "--developer",
    descriptionShort: "perform a new installation of the AB Runtime.",
    descriptionLong: `
`
});

module.exports = Command;

Command.help = function() {
    console.log(`

  usage: $ appbuilder install [name] [options]

  [name] : the name of the directory to install the AppBuilder Runtime into.

  [options] :
    --develop  : setup the installation for a programming environment

  examples:

    $ appbuilder installV1 ABv2
        - installs AppBuilder into directory ./ABv2

    $ appbuilder installV1 Dev --develop
        - installs AppBuilder into directory ./Dev
        - installs all services locally

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
                    Options.name = options._.shift();

                    // check for valid params:
                    if (!Options.name) {
                        console.log("missing required param: [name]");
                        Command.help();
                        process.exit(1);
                    }
                    done();
                },
                checkDependencies,
                copyTemplates,
                (done) => {
                    shell.pushd(Options.name);
                    done();
                },
                runSetup,
                removeFiles
            ],
            (err) => {
                shell.popd();
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
    var err;

    // verify we have 'git'
    utils.checkDependencies(["git", "docker"], done);
}

/**
 * @function copyTemplates
 * copy our template files to our project
 * @param {function} done  node style callback(err)
 */
function copyTemplates(done) {
    console.log("... copy files");
    var copyTheseFiles = [];
    utils.fileCopyTemplates("installV1", Options, copyTheseFiles, done);
}

/**
 * @function makeExecutable
 * make these files executable
 * @param {function} done  node style callback(err)
 */
// function makeExecutable(done) {
//     console.log("... make files executable:");
//     var theseFiles = []; // ["setup.sh", "setup_init.sh", "./scripts/install.sh"];
//     theseFiles.forEach((fileName) => {
//         shell.chmod("+x", fileName);
//     });
//     done();
// }

/**
 * @function removeFiles
 * remove no longer necessary files.
 * @param {function} done  node style callback(err)
 */
function removeFiles(done) {
    var filesToRemove = ["setup_init.sh", "app/app.tar.tbz"];
    filesToRemove.forEach((file) => {
        shell.rm(file);
    });
    done();
}

/**
 * @function runSetup
 * run the setup script
 * @param {function} done  node style callback(err)
 */
function runSetup(done) {
    console.log("... run setup script");
    shell.exec(`./setup_init.sh`);
}

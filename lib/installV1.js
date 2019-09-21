//
// installV1
// perform a new installation of the previous AB Runtime.
//
// options:
//  --developer   :  setup the environment for a developer
//
var async = require("async");
var fs = require("fs");
var inquirer = require("inquirer");
var path = require("path");
var progress = require("progress");
var shell = require("shelljs");
var utils = require(path.join(__dirname, "utils", "utils"));

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

    --port=[#] : the port number for incoming http / api calls

    --db.*     : options related to setting up the Maria DB environment
    --db.expose         : allow Maria DB to be accessed from your local network
    --db.port=[#]       : what port to listen on (--db.expose == true)
    --db.password=[pwd] : the db root user password
    --db.encryption=[true,false] : encrypt the db tables on disk?

    --arango.* : options related to setting up the Arango DB environment
    --arango.expose         : allow Arango DB to be accessed from your local network
    --arango.port=[#]       : what port to listen on (--arango.expose == true)
    --arango.password=[pwd] : the arango root user password


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
                convertParameters,
                questions,
                // (done) => {
                //     console.log(JSON.stringify(Options, null, 4));
                //     process.exit(0);
                // },
                cloneRepo,
                copyTemplates,
                // the remaining actions are performed in the new directory
                (done) => {
                    shell.pushd(Options.name);
                    done();
                },
                setupDB,
                // configureNGINX,  //// <<<<------- LEFT OFF HERE ------->>>>>
                runSetup,
                developerConversion,
                devInstallRepos,
                dbInit,
                removeFiles
            ],
            (err) => {
                shell.popd("-q");
                if (err) {
                    reject(err);
                    return;
                }
                console.log(`

To start the system:
    $ cd ${Options.name}
    $ npm run boot

`);
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
    // verify we have 'git'
    utils.checkDependencies(["git", "docker"], done);
}

/**
 * @function setupDB
 * run the configDB setup command.
 * @param {cb(err)} done
 */
function setupDB(done) {
    var configDBCommand = require(path.join(__dirname, "tasks", "configDB.js"));

    // scan Options for db related options:
    // "db.password
    var dbOptions = {};

    // capture any existing .db values:
    if (Options.db) {
        for (var b in Options.db) {
            dbOptions[b] = Options.db[b];
        }
    }

    // find any possible "dbParam" values
    for (var o in Options) {
        if (o.indexOf("db") == 0 && o.length > 2) {
            var o2 = o.replace("db", "");
            var key = `${o2.charAt(0).toLowerCase() + o2.slice(1)}`;
            dbOptions[key] = Options[o];
        }
    }

    for (var oo in dbOptions) {
        if (dbOptions[oo] == "false") {
            dbOptions[oo] = false;
        }
        if (dbOptions[oo] == "true") {
            dbOptions[oo] = true;
        }
    }
    console.log(JSON.stringify(dbOptions, null, 4));
    configDBCommand
        .run(dbOptions)
        .then(done)
        .catch(done);
}

/**
 * @function convertParameters
 * convert any --db.expose=true formatted variables into our shorthand vars
 * @param {function} done  node style callback(err)
 */
function convertParameters(done) {
    var paramsToCheck = ["db", "arango"];
    paramsToCheck.forEach((p) => {
        if (Options[p] && typeof Options[p] == "object") {
            var dbOpts = Object.keys(Options[p]);
            dbOpts.forEach((o) => {
                var key = `${p}${o.charAt(0).toUpperCase() + o.slice(1)}`;
                Options[key] = Options[p][o];
            });
        }
    });

    done();
}

/**
 * @function cloneRepo
 * clone the AB_runtime repo into the specified directory.
 * @param {cb(err)} done
 */
function cloneRepo(done) {
    console.log("... cloning repo");
    utils.gitCheckout(
        process.cwd(),
        "https://github.com/Hiro-Nakamura/ab_runtime_v1.git",
        Options.name,
        done
    );
}

/**
 * @function copyTemplates
 * copy our template files to our project
 * @param {function} done  node style callback(err)
 */
function copyTemplates(done) {
    console.log("... copy files");
    var copyTheseFiles = []; // ["source.docker-compose.yml"];
    utils.fileCopyTemplates("installV1", Options, copyTheseFiles, done);
}

/**
 * @function developerConversion
 * if we are setting up a developer's environment, modify the appropriate
 * configuration settings.
 * @param {function} done  node style callback(err)
 */
function developerConversion(done) {
    if (Options.develop) {
        console.log("... developer Converstion!");

        utils.filePatch(
            [
                // patch our boot command to run developer start.
                {
                    file: path.join(process.cwd(), "package.json"),
                    // tag: /bot_manager:\s*{[\w\d\s\S]*?},\s*\/\*\*/,
                    tag: /"boot":\s*"npm run production"\s*,/,
                    replace: `"boot": "npm run developer",`,
                    log: ""
                }
            ],
            done
        );
    } else {
        done();
    }
}

/**
 * @function devInstallRepos
 * install all development repos specified in the docker-compose.dev.yml.
 * @param {cb(err)} done
 */
function devInstallRepos(done) {
    var allServices = [];

    // only do this if they put the --develop flag
    if (!Options.develop) {
        done();
        return;
    }

    try {
        // scan the docker-compose.dev.yml file for links to our local development
        var contents = fs
            .readFileSync(path.join(process.cwd(), "docker-compose.dev.yml"))
            .toString();

        var serviceExp = new RegExp("source.*developer/(.*)", "g");
        var service;
        while ((service = serviceExp.exec(contents))) {
            allServices.push(service[1]);
        }
    } catch (e) {
        done(e);
        return;
    }

    // make sure developer directory exists
    var devDir = path.join(process.cwd(), "developer");
    try {
        fs.accessSync(devDir);
    } catch (e) {
        // if it doesn't, create it
        if (e.code == "ENOENT") {
            shell.mkdir(devDir);
        }
    }

    // figure out which build command to use:
    var buildCMD =
        'docker run --mount type=bind,source="$(pwd)",target=/app -w /app skipdaddy/install-ab:developer_v2 npm install';

    if ("win32" == process.platform) {
        buildCMD =
            "docker run --mount type=bind,source=%cd%,target=/app -w /app skipdaddy/install-ab:developer_v2 npm install";
    }

    var bar = new progress("  installing git repos [:spinner][:bar] :tickStr", {
        complete: "=",
        incomplete: " ",
        width: 20,
        total: allServices.length * 10 + 1
    });
    var tokens = "|/-\\";
    var idxTokens = 0;
    var tickVal = 0;
    var tickStr = "";
    var tick = () => {
        // console.log(`::tick::[${tokens[idxTokens]}]`);
        bar.tick(tickVal, { spinner: tokens[idxTokens], tickStr: tickStr });
        idxTokens++;
        if (idxTokens >= tokens.length) {
            idxTokens = 0;
        }
        // reset tickVal to 0 after each update.
        if (tickVal > 0) {
            tickVal = 0;
        }
    };

    var intervalID = setInterval(tick, 200);
    bar.tick({ spinner: tokens[idxTokens] });

    shell.pushd("-q", devDir);
    // console.log(".. in ", process.cwd());
    async.eachSeries(
        allServices,
        (s, cb) => {
            async.series(
                [
                    (next) => {
                        // for each link then try to clone a repository
                        tickStr = `git clone ${s}`;
                        var repoName = `${s}`;
                        var gitURL = `https://github.com/appdevdesigns/${repoName}.git`;
                        shell.exec(
                            `git clone ${gitURL} ${s}`,
                            { async: true, silent: true },
                            (/*code, stdout, stderr*/) => {
                                tickVal = 3;
                                next();
                            }
                        );
                    },

                    (next) => {
                        tickStr = `${s} -> npm install (takes a while)`;
                        shell.pushd("-q", path.join(process.cwd(), s));
                        shell.mkdir("-p", "node_modules");
                        shell.exec(
                            buildCMD,
                            { async: true, silent: true },
                            (/*code, stdout, stderr*/) => {
                                next();
                            }
                        );
                    }
                ],
                (err) => {
                    shell.popd("-q");
                    tickVal = 7;
                    cb(err);
                }
            );
        },
        (err) => {
            tickStr = "... all done.";
            tick();
            clearTimeout(intervalID);
            shell.popd("-q");

            // let's give the progress bar 1s to display itself before continuing on.
            setTimeout(() => {
                done(err);
            }, 1000);
        }
    );
}

/**
 * @function removeFiles
 * remove no longer necessary files.
 * @param {function} done  node style callback(err)
 */
function removeFiles(done) {
    var filesToRemove = ["setup_init.sh"];
    filesToRemove.forEach((file) => {
        shell.rm(file);
    });
    done();
}

/**
 * @function questions
 * ask questions for the setup parameters
 * @param {function} done  node style callback(err)
 */
function questions(done) {
    inquirer
        .prompt([
            {
                name: "port",
                type: "input",
                message: "What port do you want AppBuilder to listen on (80):",
                default: 80,
                when: (values) => {
                    return !values.port && !Options.port;
                }
            },
            {
                name: "dbExpose",
                type: "confirm",
                message: "Do you want to expose the DB :",
                default: false,
                when: (values) => {
                    return (
                        !values.dbExpose &&
                        typeof Options.dbExpose == "undefined"
                    );
                }
            },
            {
                name: "dbPort",
                type: "input",
                message: "What port do you want the DB to listen on:",
                default: 3306,
                when: (values) => {
                    return (
                        (values.dbExpose || Options.dbExpose) &&
                        !values.dbPort &&
                        !Options.dbPort
                    );
                }
            },
            {
                name: "dbPassword",
                type: "input",
                message: "What password for the DB root user:",
                default: "r00t",
                when: (values) => {
                    return !values.dbPassword && !Options.dbPassword;
                }
            },
            {
                name: "arangoPassword",
                type: "input",
                message: "What password for the Arango root user:",
                default: "r00t",
                when: (values) => {
                    return !values.arangoPassword && !Options.arangoPassword;
                }
            },
            {
                name: "arangoExpose",
                type: "confirm",
                message: "Do you want to expose Arango DB:",
                default: false,
                when: (values) => {
                    return !values.arangoExpose && !Options.arangoExpose;
                }
            },
            {
                name: "arangoPort",
                type: "input",
                message: "What port do you want Arango to listen on:",
                default: 8529,
                when: (values) => {
                    return (
                        (values.arangoExpose || Options.arangoExpose) &&
                        !values.arangoPort &&
                        !Options.arangoPort
                    );
                }
            }
        ])
        .then((answers) => {
            // update Options with our answers:
            for (var a in answers) {
                Options[a] = answers[a];
            }
            done();
        });
}

/**
 * @function dbInit
 * run the DB initialization service one time.
 * @param {function} done  node style callback(err)
 */
function dbInit(done) {
    console.log("... initializing the databases");

    Promise.resolve()
        .then(() => {
            console.log("    - starting the db stack");
            // run the db stack
            shell.exec("npm run dbInstall", { silent: true });
        })
        .then(() => {
            console.log("    - monitor the db logs ");
            // monitor the db_db logs to find the final ready
            return new Promise((resolve /*, reject */) => {
                var endCounter = 0;

                var timer;

                function resetTimer() {
                    console.log("resetTimer");
                    if (timer) {
                        console.log("... clearing timer");
                        clearTimeout(timer);
                    }

                    timer = setTimeout(() => {
                        console.log("timed out waiting for DB to initialize:");
                        // var err = new Error("Timed Out");
                        // err.code = "EDBTIMEOUT";
                        clearTimeout(timer);
                        resolve();
                    }, 18 * 1000); /* 18 sec timeout */
                }
                resetTimer();

                var child = shell.exec("npm run logDBInstall", {
                    async: true,
                    silent: true
                });
                var processData = (data) => {
                    resetTimer();
                    console.log(`data[${endCounter}][${data}]`);
                    if (data.indexOf("mysqld: ready for connections") != -1) {
                        endCounter++;
                        if (endCounter >= 2) {
                            clearTimeout(timer);
                            resolve();
                        }
                    }
                };
                child.stdout.on("data", processData);
                child.stderr.on("data", processData);
            });
        })
        .then(() => {
            // tear down the stack.
            shell.exec("docker stack rm db", { silent: true });
            done();
        })
        .catch((err) => {
            done(err);
        });
}

/**
 * @function runSetup
 * run the setup script
 * @param {function} done  node style callback(err)
 */
function runSetup(done) {
    if (Options.develop) {
        console.log("... run setup script");
        shell.exec(`./setup_init.sh`);
    }
    done();
}

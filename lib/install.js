//
// install
// perform a new installation of the AB Runtime.
//
// options:
//  --developer   :  setup the environment for a developer
//
var async = require("async");
// var fs = require("fs");
var path = require("path");
var shell = require("shelljs");
var utils = require(path.join(__dirname, "utils", "utils"));
var Setup = require(path.join(__dirname, "setup.js"));
var TenantAdmin = require(path.join(
   __dirname,
   "tasks",
   "configTenantAdmin.js"
));

var Options = {}; // the running options for this command.

//
// Build the Install Command
//
var Command = new utils.Resource({
   command: "install",
   params: "--developer",
   descriptionShort: "perform a new installation of the AB Runtime.",
   descriptionLong: `
`,
});

module.exports = Command;

Command.help = function () {
   console.log(`

  usage: $ appbuilder install [name] [options]

  [name] : the name of the directory to install the AppBuilder Runtime into.

  [options] :
    --stack=[ab] : the Docker Stack reference ("ab" by default) to use for this
                   install.
    --develop  : setup the installation for a programming environment
    --V1       : setup the v1 appbuilder environment
    --travisCI : indicate this is running in travisCI environment.
    --prod2021 : setup the 2021 production environment

    settings for DB:
    --db.*     : options related to setting up the Maria DB environment
    --db.expose         : allow Maria DB to be accessed from your local network
    --db.port=[#]       : what port to listen on (--db.expose == true)
    --db.password=[pwd] : the db root user password
    --db.encryption=[true,false] : encrypt the db tables on disk?

    tenant administrator:
    --tenant.username [string] : the default tenant admin username
    --tenant.password [string] : the default tenant admin password
    --tenant.email    [string] : the default tenant admin email

  examples:

    $ appbuilder install ABv2
        - installs AppBuilder into directory ./ABv2

    $ appbuilder install Dev --develop
        - installs AppBuilder into directory ./Dev
        - installs all services locally

    $ appbuilder install sails --V1
        - installs AppBuilder v1 into directory ./sails

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
               Options.name = options._.shift();

               // check for valid params:
               if (!Options.name) {
                  console.log("missing required param: [name]");
                  Command.help();
                  process.exit(1);
               }

               // FIX: make sure we catch mistyped --Develop
               Options.develop = Options.develop || Options.Develop;

               utils.unstringifyBools(Options);
               done();
            },
            checkV1,
            checkProd2021,
            checkDependencies,
            cloneRepo,
            installDependencies,
            runSetup,
            devInstallServices,
            compileUI,
            configTenantAdmin,
            initializeConfig,
            initializeDB,
         ],
         (err) => {
            // now make sure we have popd() all remaining directories
            // we start by pushd() an additional one and then using
            // the returned list of entries as a basis for removing
            // all the remaining.
            var list = shell.pushd("-q", process.cwd());
            list.pop(); // we need to popd() until there is only 1
            // remove the rest:
            list.forEach(() => {
               shell.popd("-q");
            });

            // if there was an error that wasn't an ESKIP error:
            if (err && (!err.code || err.code != "ESKIP")) {
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
   // verify we have 'git'
   utils.checkDependencies(["git", "docker"], done);
}

/**
 * @function checkV1
 * check to see if they are requesting an install of the V1 AppBuilder environment.
 * if they are, pass control to the installV1 command and skip the rest of the steps.
 * @param {function} done  node style callback(err)
 */
function checkV1(done) {
   if (Options["V1"] || Options["v1"]) {
      try {
         Options._.unshift(Options.name);
         delete Options.name;

         var installV1 = require(path.join(__dirname, "installV1.js"));
         installV1
            .run(Options)
            .then(() => {
               var skipError = new Error("Just Skip this install");
               skipError.code = "ESKIP";
               done(skipError);
            })
            .catch(done);
      } catch (e) {
         console.error("Unable to find installV1.js install script.");
         done(e);
      }
   } else {
      done();
   }
}

/**
 * check to see if they are requesting an install of the 2021 production environment.
 * if they are, pass control to the prod2021 command and skip the rest of the steps.
 * @param {function} done  node style callback(err)
 */
function checkProd2021(done) {
   if (Options["prod2021"]) {
      try {
         Options._.unshift(Options.name);
         delete Options.name;

         var prod2021 = require(path.join(__dirname, "prod2021.js"));
         prod2021
            .run(Options)
            .then(() => {
               var skipError = new Error("Just Skip this install");
               skipError.code = "ESKIP";
               done(skipError);
            })
            .catch(done);
      } catch (e) {
         console.error("Unable to find prod2021.js install script.");
         done(e);
      }
   } else {
      done();
   }
}

/**
 * @function cloneRepo
 * clone the AB_runtime repo into the specified directory.
 * @param {cb(err)} done
 */
function cloneRepo(done) {
   console.log("... cloning repo");
   shell.exec(
      `git clone https://github.com/Hiro-Nakamura/ab_runtime.git ${Options.name}`
   );

   shell.pushd("-q", Options.name);
   done();
}

/**
 * @function installDependencies
 * clone the AB_runtime repo into the specified directory.
 * @param {cb(err)} done
 */
function installDependencies(done) {
   console.log("... install dependencies");
   shell.exec(`npm install`);
   done();
}

/**
 * @function runSetup
 * perform the "$ appbuilder setup" command.
 * @param {cb(err)} done
 */
function runSetup(done) {
   Setup.run(Options)
      .then((opt) => {
         for (var o in opt) {
            if (!Options[o]) {
               Options[o] = opt[o];
            }
         }
         done();
      })
      .catch(done);
}

/**
 * @function devInstallServices
 * install all of our development services.
 * @param {cb(err)} done
 */
function devInstallServices(done) {
   // always install the UI platform:
   var services = ["ab_platform_web"];

   async.series(
      [
         (next) => {
            // only do this if they put the --develop flag
            if (!Options.develop) {
               next();
               return;
            }

            utils.gitScanDevYML((err, list) => {
               if (err) {
                  done(err);
                  return;
               }
               services = services.concat(list);
               next();
            });
         },
         (next) => {
            // now install the repos:
            utils.gitInstallServices(
               services,
               { silent: Options.travisCI },
               next
            );
         },
      ],
      (err) => {
         done(err);
      }
   );
}
/*
function devInstallServices(done) {
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
      'docker run --mount type=bind,source="$(pwd)",target=/app -w /app node npm install';

   if ("win32" == process.platform) {
      buildCMD =
         "docker run --mount type=bind,source=%cd%,target=/app -w /app node npm install";
   }

   shell.pushd("-q", devDir);
   console.log(".. in ", process.cwd());
   async.eachSeries(
      allServices,
      (s, cb) => {
         // for each link then try to clone a repository
         var repoName = `ab_service_${s}`;
         var gitURL = `https://github.com/Hiro-Nakamura/${repoName}.git`;
         shell.exec(`git clone ${gitURL} ${s}`);
         shell.pushd("-q", path.join(process.cwd(), s));
         shell.mkdir("-p", "node_modules");
         shell.exec(buildCMD);
         shell.popd("-q");
         cb();
      },
      (err) => {
         shell.popd("-q");
         done(err);
      }
   );
}
*/

function compileUI(done) {
   console.log();
   console.log("compile the web UI");
   shell.pushd("-q", path.join(process.cwd(), "developer", "ab_platform_web"));
   shell.exec("node node_modules/webpack-cli/bin/cli.js  --progress");
   shell.popd("-q");
   done();
}

function configTenantAdmin(done) {
   TenantAdmin.run(Options.tenant || {})
      .then(() => {
         done();
      })
      .catch(done);
}

function initializeConfig(done) {
   console.log();
   console.log("initialize the configuration volumes");
   utils
      .configInit(Options, "config-compose.yml")
      .then(() => {
         done();
      })
      .catch(done);
}

function initializeDB(done) {
   console.log();
   console.log("initialize the DB tables");
   utils
      .dbInit(Options, "dbinit-compose.yml")
      .then(() => {
         done();
      })
      .catch(done);
   // shell.exec(path.join(process.cwd(), "DBInit.js"));
   // done();
}

//
// installV1
// perform a new installation of the previous AB Runtime.
//
// options:
//  --developer   :  setup the environment for a developer
//
var async = require("async");
// var fs = require("fs");
var inquirer = require("inquirer");
var path = require("path");
// var progress = require("progress");
var shell = require("shelljs");
var utils = require(path.join(__dirname, "utils", "utils"));

var Options = {}; // the running options for this command.

//
// Build the Install Command
//
var Command = new utils.Resource({
   command: "installV1",
   params: "--develop",
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

    --nginx.* : options related to setting up the Nginx proxy server
    --nginx.enable      : enable nginx proxy
    --nginx.sslType     : ssl encryption options ["none", "self", "exist"]
                            "none"  : no ssl encryption
                            "self"  : self signed certificates
                            "exist" : existing certificate

    (if --nginx.sslType == "self" then:)
    --nginx.sslCountryName
    --nginx.sslProvinceName
    --nginx.sslLocalityName
    --nginx.sslOrganizationName
    --nginx.sslUnitName
    --nginx.sslCommonName
    --nginx.sslEmailAddress
    --nginx.sslChallengePW

    if --nginx.sslType == "exist" then:
    --nginx.pathKey
    --nginx.pathCert


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
            portCheck,
            cloneRepo,
            npmInstallBase,
            copyTemplates,
            // the remaining actions are performed in the new directory
            (done) => {
               shell.pushd("-q", Options.name);
               done();
            },
            setupDB,
            configureNGINX,
            runSetup,
            developerConversion,
            devInstallRepos,
            buildAppBuilder,
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
    $ npm run up

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

   dbOptions = utils.unstringifyBools(dbOptions);
   configDBCommand
      .run(dbOptions)
      .then(done)
      .catch(done);
}

function configureNGINX(done) {
   var nOptions = {};

   // filter on arguments passed in in the form of "--nginx.arg", remove the prefix and pass the remaining args on
   for (var i in Options.nginx) {
      nOptions[i] = Options.nginx[i];
   }
   nOptions = utils.unstringifyBools(nOptions);
   nOptions.port = Options.port;

   var config = require(path.join(__dirname, "tasks", "configNginx.js"));
   config
      .run(nOptions)
      .then(() => {
         done();
      })
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
 * @function portCheck
 * verify the requested ports are not already in use on this system
 * @param {cb(err)} done
 */
function portCheck(done) {
   console.log("... checking ports");
   var checkPorts = [Options.port, Options.dbPort, Options.arangoPort];
   async.eachSeries(
      checkPorts,
      (port, cb) => {
         utils.portInUse(port, (inUse) => {
            if (!inUse) {
               // double check existing docker services:
               var existingDockerService = shell.exec(
                  `docker service ls | grep ":${port}"`
               ).stdout;
               if (existingDockerService == "") {
                  // console.log(`   - port ${port} is not in use.`);
                  cb();
                  return;
               }
            }
            var error = new Error(
               `Either port ${port} is in use or you don't have permission.`
            );
            cb(error);
         });
      },
      (err) => {
         done(err);
      }
   );
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
 * @function npmInstallBase
 * make sure the base directory has it's npm modules installed:
 * @param {cb(err)} done
 */
function npmInstallBase(done) {
   console.log("... npm install runtime_v1");
   shell.pushd("-q", path.join(process.cwd(), Options.name));
   shell.mkdir("-p", "node_modules");
   shell.exec("npm install");
   shell.popd("-q");
   done();
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
      console.log("... developer conversion!");

      utils.filePatch(
         [
            // patch our boot command to run developer start.
            {
               file: path.join(process.cwd(), "package.json"),
               // tag: /bot_manager:\s*{[\w\d\s\S]*?},\s*\/\*\*/,
               tag: /"up":\s*"npm run production"\s*,/,
               replace: `"up": "npm run developer",`,
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
   // only do this if they put the --develop flag
   if (!Options.develop) {
      done();
      return;
   }

   utils.gitScanDevYML((err, services) => {
      if (err) {
         done(err);
         return;
      }

      // now install the repos:
      utils.gitInstallServices(services, done);
   });
}

/*
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
                     (/*code, stdout, stderr* /) => {
                        tickVal = 3;
                        next();
                     }
                  );
               },

               (next) => {
                  tickStr = `${s} -> npm install (takes a while)`;
                  shell.pushd("-q", path.join(process.cwd(), s));
                  shell.mkdir("-p", "node_modules");
                  shell.exec("git checkout develop", { silent: true });
                  shell.exec(
                     buildCMD,
                     { async: true, silent: true },
                     (/*code, stdout, stderr* /) => {
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
         clearInterval(intervalID);
         shell.popd("-q");

         // let's give the progress bar 1s to display itself before continuing on.
         setTimeout(() => {
            done(err);
         }, 1000);
      }
   );
}
*/

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
            message: "What port do you want AppBuilder to listen on:",
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
                  typeof values.dbExpose == "undefined" &&
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
               return (
                  typeof values.arangoExpose == "undefined" &&
                  typeof Options.arangoExpose == "undefined"
               );
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

         var defaults = {
            dbPort: 8889,
            arangoPort: 8529
         };
         for (var d in defaults) {
            if (!Options[d]) {
               Options[d] = defaults[d];
            }
         }
         done();
      });
}

/**
 * @function buildAppBuilder
 * webpack build the AppBuilder in Develop mode
 * @param {function} done  node style callback(err)
 */
function buildAppBuilder(done) {
   if (Options.develop) {
      console.log("... rebuild AppBuilder");
      var buildCMD =
         'docker run --mount type=bind,source="$(pwd)/developer/app_builder",target=/app -w /app node:6.12.3 npm run build';
      if ("win32" == process.platform) {
         buildCMD =
            "docker run --mount type=bind,source=%cd%/developer/app_builder,target=/app -w /app node:6.12.3 npm run build";
      }
      shell.exec(buildCMD);
   }
   done();
}

/**
 * @function dbInit
 * run the DB initialization service one time.
 * @param {function} done  node style callback(err)
 */
function dbInit(done) {
   console.log();
   console.log("initialize the DB tables");
   utils
      .dbInit("dbinit-compose.yml")
      .then(done)
      .catch(done);
}

/**
 * @function runSetup
 * run the setup script
 *    - performs the un tar operation
 *
 * @param {function} done  node style callback(err)
 */
function runSetup(done) {
   if (Options.develop) {
      console.log("... untar app");
      var cmd =
         'docker run --mount type=bind,source="$(pwd)/app",target=/app --mount type=bind,source="$(pwd)/resources/scripts/unTar.sh",target=/app/unTar.sh  skipdaddy/install-ab:developer_v2 ./unTar.sh';
      if ("win32" == process.platform) {
         cmd =
            "docker run --mount type=bind,source=%cd%/app,target=/app --mount type=bind,source=%cd%/resources/scripts/unTar.sh,target=/app/unTar.sh  skipdaddy/install-ab:developer_v2 ./unTar.sh";
      }
      shell.exec(cmd);
   }
   done();
}

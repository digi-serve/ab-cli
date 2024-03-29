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
var crypto = require("crypto");
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
`,
});

module.exports = Command;

Command.help = function () {
   console.log(`

  usage: $ appbuilder install [name] [options]

  [name] : the name of the directory to install the AppBuilder Runtime into.

  [options] :
    --develop  : setup the installation for a programming environment

    --port=[#] : the port number for incoming http / api calls

    --stack=[ab] : the Docker Stack reference ("ab" by default) to use for this install.

    --db.*     : options related to setting up the Maria DB environment
    --db.expose         : allow Maria DB to be accessed from your local network
    --db.port=[#]       : what port to listen on (--db.expose == true)
    --db.password=[pwd] : the db root user password
    --db.encryption=[true,false] : encrypt the db tables on disk?


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


    --smtp.* : options related to setting up the email notification service
    --smtp.enable    : enable the smtp service
    --smtp.host      : the DNS name / IP Address of the SMTP server
    --smtp.port      : the smtp port (default 25, TLS: 465)
    --smtp.tls       : tls options: ["noTLS", "serverSupport", "requireTLS"]
                        "noTLS"         : do not use TLS
                        "serverSupport" : upgrade to TLS if server supports it
                        "requireTLS"    : require TLS

    --smtp.auth      : the type of authentication: ["plain", "login", "oauth2"]
                        "plain"  : use plain text
                        "login"  : use user / password authentication
                        "oauth2" : OAuth2 credentials

   if --smtp.auth == "login" then:
   --smtp.authUser   : The login user name
   --smtp.authPass   : The login password



  examples:

    $ appbuilder installV1 ABv2
        - installs AppBuilder into directory ./ABv2

    $ appbuilder installV1 Dev --develop
        - installs AppBuilder into directory ./Dev
        - installs all services locally

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
            patchDockerStack,
            npmInstallBase,
            copyTemplates,
            // the remaining actions are performed in the new directory
            (done) => {
               shell.pushd("-q", Options.name);
               done();
            },
            setupDB,
            configureNGINX,
            configureEmailNotifications,
            runSetup,
            developerConversion,
            devInstallRepos,
            buildAppBuilder,
            dbInit,
            removeFiles,
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
   var dbOptions = utils.optionsPull(Options, "db");
   dbOptions.v1 = true;
   console.log("configDB options:", dbOptions);
   configDBCommand.run(dbOptions).then(done).catch(done);
}

function configureNGINX(done) {
   // filter on arguments passed in in the form of "--nginx.arg", remove the
   // prefix and pass the remaining args on
   var nOptions = utils.optionsPull(Options, "nginx");
   nOptions.port = Options.port;
   nOptions.v1 = true;
   var config = require(path.join(__dirname, "tasks", "configNginx.js"));
   config
      .run(nOptions)
      .then(() => {
         var sslCommand = require(path.join(__dirname, "ssl.js"));
         var sslOptions = Options.ssl || {};

         // pull any of our --nginx.sslXXXX options into sslOptions
         for (var i in nOptions) {
            if (i == "sslType") {
               var sslType = Options[i];
               sslOptions[sslType] = true;
               sslOptions["process"] = sslType;
            } else if (i.indexOf("ssl") == 0 && i.length > 3) {
               sslOptions[i] = nOptions[i];
            }
         }

         sslCommand.run(sslOptions).then(done).catch(done);
      })
      .catch(done);
}

function configureEmailNotifications(done) {
   // filter on arguments passed in in the form of "--smtp.arg", remove the
   // prefix and pass the remaining args on
   var nOptions = utils.optionsPull(Options, "smtp");
   var config = require(path.join(
      __dirname,
      "tasks",
      "configNotificationEmail.js"
   ));
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
   var paramsToCheck = ["db"];
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
   var checkPorts = [Options.port];
   if (Options.dbExpose) {
      checkPorts.push(Options.dbPort);
   }

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
               log: "    npm run up => developer",
            },

            // patch our UP.sh to run developer start.
            {
               file: path.join(process.cwd(), "UP.sh"),
               // tag: /bot_manager:\s*{[\w\d\s\S]*?},\s*\/\*\*/,
               tag: /compose\.yml/,
               replace: `compose.dev.yml`,
               log: "    UP.sh => develop",
            },

            // patch the root .adn file to access our default DB
            {
               file: path.join(process.cwd(), "app", ".adn"),
               // tag: /bot_manager:\s*{[\w\d\s\S]*?},\s*\/\*\*/,
               tag: /"label-pass"\s*:\s*"root"\s*,/,
               replace: `"label-pass": "${Options.dbPassword}",`,
               log: "    .adn updated",
            },
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
      utils.gitInstallServices(services, { silent: Options.travisCI }, done);
   });
}

/**
 * @function patchDockerStack
 * update the support scripts to reference a Docker stack specific to this
 * install.
 * @param {cb(err)} done
 */
function patchDockerStack(done) {
   // Docker Stack update:
   utils.filePatch(
      [
         // patch our npm commands to reference our Docker Stack
         {
            file: path.join(process.cwd(), Options.name, "package.json"),
            tag: / ab/g,
            replace: ` ${Options.stack || "ab"}`,
            log: `    Docker Stack: package.json => ${Options.stack || "ab"}`,
         },
         {
            file: path.join(process.cwd(), Options.name, "cli.sh"),
            tag: /ab_/g,
            replace: `${Options.stack || "ab"}_`,
            log: `    Docker Stack: logs.js => ${Options.stack || "ab"}`,
         },
         {
            file: path.join(process.cwd(), Options.name, "Down.sh"),
            tag: / ab/g,
            replace: ` ${Options.stack || "ab"}`,
            log: `    Docker Stack: Down.sh => ${Options.stack || "ab"}`,
         },
         {
            file: path.join(process.cwd(), Options.name, "logs.js"),
            tag: /ab_/g,
            replace: `${Options.stack || "ab"}_`,
            log: `    Docker Stack: logs.js => ${Options.stack || "ab"}`,
         },
         {
            file: path.join(process.cwd(), Options.name, "UP.sh"),
            tag: / ab/g,
            replace: ` ${Options.stack || "ab"}`,
            log: `    Docker Stack: UP.sh => ${Options.stack || "ab"}`,
         },
      ],
      done
   );
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
   // Random password by default
   var defaultPassword = crypto.randomBytes(30).toString("base64");

   inquirer
      .prompt([
         {
            name: "stack",
            type: "input",
            message:
               "What Docker Stack reference do you want this install to use:",
            default: "ab",
            when: (values) => {
               return !values.stack && !Options.stack;
            },
         },
         {
            name: "port",
            type: "input",
            message: "What port do you want AppBuilder to listen on:",
            default: 80,
            when: (values) => {
               return !values.port && !Options.port;
            },
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
            },
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
            },
         },
         {
            name: "dbPassword",
            type: "input",
            message: "What password for the DB root user:",
            default: defaultPassword,
            when: (values) => {
               return !values.dbPassword && !Options.dbPassword;
            },
         },
         // {
         //    name: "arangoPassword",
         //    type: "input",
         //    message: "What password for the Arango root user:",
         //    default: "r00t",
         //    when: (values) => {
         //       return !values.arangoPassword && !Options.arangoPassword;
         //    }
         // },
         // {
         //    name: "arangoExpose",
         //    type: "confirm",
         //    message: "Do you want to expose Arango DB:",
         //    default: false,
         //    when: (values) => {
         //       return (
         //          typeof values.arangoExpose == "undefined" &&
         //          typeof Options.arangoExpose == "undefined"
         //       );
         //    }
         // },
         // {
         //    name: "arangoPort",
         //    type: "input",
         //    message: "What port do you want Arango to listen on:",
         //    default: 8529,
         //    when: (values) => {
         //       return (
         //          (values.arangoExpose || Options.arangoExpose) &&
         //          !values.arangoPort &&
         //          !Options.arangoPort
         //       );
         //    }
         // }
      ])
      .then((answers) => {
         // update Options with our answers:
         for (var a in answers) {
            Options[a] = answers[a];
         }

         var defaults = {
            dbPort: 8889,
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
   utils.dbInitV1(Options, "dbinit-compose.yml").then(done).catch(done);
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
      // The user's uid and gid will be passed in as parameters to the script.
      cmd += " " + process.getuid() + " " + process.getgid();
      var sopt = { silent: Options.travisCI ? true : false };
      if (Options.travisCI) {
         console.log(
            "    this can take a really long time, so just be patient"
         );
      }
      shell.exec(cmd, sopt);
   }
   done();
}

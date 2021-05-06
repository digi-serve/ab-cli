//
// prod2021
// perform a new installation of the 2021 production AB.
// (this was based on installV1)
//
var async = require("async");
var fs = require("fs");
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
   command: "prod2021",
   params: "--prod2021",
   descriptionShort:
      "perform a new installation of the AB production 2021 docker stack.",
   descriptionLong: `
`,
});

module.exports = Command;

Command.help = function () {
   console.log(`

  usage: $ appbuilder prod2021 [name] [options]

  [name] : the name of the directory to install the AppBuilder runtime into.

  [options] :
    --port=[#] : the port number for incoming http / api calls

    --stack=[ab] : the Docker Stack reference ("ab" by default) to use for this install.

    --db.*     : options related to setting up the Maria DB environment
    --db.expose         : allow Maria DB to be accessed from your local network
    --db.port=[#]       : what port to listen on (--db.expose == true)
    --db.password=[pwd] : the db root user password


    --smtp.* : options related to setting up the email notification service
    --smtp.enable    : enable the email service
    --smtp.host      : the domain name / IP Address of the SMTP server
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

    $ appbuilder prod2021 ABv2
        - installs AppBuilder into directory ./ABv2

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
            copyTemplates,
            patchDockerStack,
            // the remaining actions are performed in the new directory
            (done) => {
               shell.pushd("-q", Options.name);
               done();
            },
            setPassword,
            //configureEmailNotifications,
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
    $ ./UP.sh

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

//
// SKIP
//
/*
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
*/

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
 * Set the MariaDB root password
 */
function setPassword(done) {
   // fileCopyTemplates does not overwrite the existing mysql/password file
   // so we do that here. The runtime ab-launcher.js will take care of
   // syncing config/local.js with the password.
   fs.writeFile("mysql/password", Options.dbPassword, "utf8", done);
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
      "https://github.com/appdevdesigns/ab-production-stack.git",
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
   var copyTheseFiles = [];
   utils.fileCopyTemplates("prod2021", Options, copyTheseFiles, done);
}

/**
 * @function patchDockerStack
 * patch the docker-compose.yml file
 * @param {cb(err)} done
 */
function patchDockerStack(done) {
   // Docker Stack update:
   utils.filePatch(
      [
         {
            file: path.join(process.cwd(), Options.name, "docker-compose.yml"),
            tag: /_SAILS_EXTERNAL_PORT_/g,
            replace: Options.port,
            log: `    docker-compose.yml => sails port: ` + Options.port,
         },
         {
            file: path.join(process.cwd(), Options.name, "docker-compose.yml"),
            tag: /_DB_EXTERNAL_PORT_/g,
            replace: Options.dbPort,
            log: `    docker-compose.yml => db port: ` + Options.dbPort,
         },
      ],
      done
   );
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
               "What stack name do you want to use to differentiate this from other Docker stacks on the server:",
            default: Options.name,
            when: (values) => {
               return !values.stack && !Options.stack;
            },
         },
         {
            name: "port",
            type: "input",
            message:
               "What port do you want AppBuilder to listen on for web connections:",
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

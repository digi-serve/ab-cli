//
// setup
// create the local config options for the AppBuilder runtime.
//
// options:
//  --port : the port to listen on for the local system
//  --tag  : the docker tag of the images to run
//
const async = require("async");
const fs = require("fs");
const inquirer = require("inquirer");
const { nanoid } = require("nanoid");
const path = require("path");
const utils = require(path.join(__dirname, "utils", "utils"));

const Options = {}; // the running options for this command.

//
// Build the Command
//
const Command = new utils.Resource({
   command: "setup",
   params: "--port [port#] --tag [dockerTag]",
   descriptionShort:
      "setup the running configuration for an AppBuilder config.",
   descriptionLong: `
`,
});

module.exports = Command;

/**
 * @function help
 * display specific help instructions for the setup command.
 */
Command.help = function () {
   console.log(`

  usage: $ appbuilder setup [options]

  Update the appbuilder configuration .

  [options] :
    --port [port#] : <number> specify the port to listen on

    --stack=[ab] : the Docker Stack reference ("ab" by default) to use for this install.

    --tag [master,develop] : <string> which version of the Docker containers to use.

    settings for DB:
    --db.*     : options related to setting up the Maria DB environment
    --db.expose         : allow Maria DB to be accessed from your local network
    --db.port=[#]       : what port to listen on (--db.expose == true)
    --db.password=[pwd] : the db root user password
    --db.encryption=[true,false] : encrypt the db tables on disk?


    settings for ssl:
    --ssl.[none, self, exist]

    (if ssl.exist)
    --ssl.pathKey /path/to/key.cert
    --ssl.pathCert /path/to/cert.cert

    (if ssl.self)
    --ssl.sslCountryName [string] : the name of the cert country
    --ssl.sslProvinceName [string]
    --ssl.sslLocalityName [string]
    --ssl.sslOrganizationName [string]
    --ssl.sslUnitName [string]
    --ssl.sslCommonName [string] : host name
    --ssl.sslEmailAddress [string]
    --ssl.sslChallengePW [string] : challenge password


    settings for bot_manager:
    --bot.enable [true,false] : enable the #Slack bot
    --bot.token [token]    : enter the #Slack bot API token
    --bot.name [name]      : the name displayed for the #Slack bot
    --bot.slackChannel [name] : which #Slack channel to interact with
    --bot.hosttcpport [port#] : (on Mac OS) specify a host port for
                                the command processor

    settings for notification_email:
    --smtp.enable [true,false]
    --smtp.host   [string]
    --smtp.port   [integer]
    --smtp.tls    [noTLS, serverSupport, requireTLS]
    --smtp.auth   [plain, login, oauth2]

    (if smtp.auth == login)
    --smtp.authUser [string]
    --smtp.authPass [string]



  examples:

    $ appbuilder setup --port 8080 --tag master
        - edits docker-compose.yml to listen on port 8080
        - edits docker-compose.yml to use :master containers
        - asks questions for the remaining configuration options

`);
};

var flattenParams = {
   // paramPath : flat param
   "db.expose": "dbExpose",
   "db.port": "dbPort",
};
// {hash}
// this hash maps incoming parameter obj into their "flattend" params
// that are used in our templates.

Command.run = function (options) {
   options = options || {};

   return new Promise((resolve, reject) => {
      // display help instructions if that was requested.
      if (options.help) {
         Command.help();
         process.exit();
      }

      async.series(
         [
            // copy our passed in options to our Options
            (done) => {
               for (var o in options) {
                  Options[o] = options[o];
               }
               Object.keys(flattenParams).forEach((kpath) => {
                  var parts = kpath.split(".");
                  if (
                     Options[parts[0]] &&
                     typeof Options[parts[0]][parts[1]] != "undefined"
                  ) {
                     Options[flattenParams[kpath]] =
                        Options[parts[0]][parts[1]];
                  }
               });
               done();
            },

            defaultValues,
            questions,
            copyTemplateFiles,
         ],
         (err) => {
            if (err) {
               reject(err);
               return;
            }
            resolve(Options);
         }
      );
   });
};

/**
 * @function defaultValues
 * Prepare our Options with proper values before we can ask questions.
 * @param {cb(err)} done
 */
function defaultValues(done) {
   if (!Options.authType) {
      if (Options.casEnabled) {
         Options.authType = "CAS";
      }
      if (Options.oktaEnabled) {
         Options.authType = "OKTA";
      }
   }

   done();
}

/**
 * @function questions
 * Present the user with a list of configuration questions.
 * If the answer for a question is already present in Options, then we
 * skip that question.
 * @param {cb(err)} done
 */
function questions(done) {
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

         //
         // Nginx
         //
         {
            name: "port",
            type: "input",
            message: "What port do you want AppBuilder to listen on (80):",
            default: 80,
            when: (values) => {
               return !values.port && !Options.port;
            },
         },

         //
         // Database
         //
         {
            name: "dbExpose",
            type: "confirm",
            message: "Do you want to expose the DB :",
            default: false,
            when: (values) => {
               return (
                  !values.dbExpose && typeof Options.dbExpose == "undefined"
               );
            },
         },
         {
            name: "dbPort",
            type: "input",
            message: "What port do you want the DB to listen on:",
            default: 3306,
            when: (values) => {
               return values.dbExpose && !values.dbPort && !Options.dbPort;
            },
         },
         {
            name: "dbPassword",
            type: "input",
            message: "Enter the password for the DB Root User?",
            default: nanoid(),
            when: (values) => {
               return !values.dbPassword && !Options.dbPassword;
            },
         },
         {
            name: "tag",
            type: "list",
            message: "Which Docker Tags to use:",
            default: "latest",
            choices: [
               {
                  name: "latest released version (recommended for production)",
                  value: "latest",
                  short: "latest",
               },
               {
                  name: "master",
                  value: "master",
                  short: "master",
               },
               {
                  name: "develop",
                  value: "develop",
                  short: "develop",
               },
            ],
            when: (values) => {
               return !values.tag && !Options.tag;
            },
         },

         //
         // Authentication
         //
         {
            name: "authType",
            type: "list",
            choices: [
               {
                  // secure: false, ignoreTLS: true
                  name: "login",
                  value: "login",
                  short: "login",
               },
               {
                  // secure: false
                  name: "CAS",
                  value: "CAS",
                  short: "CAS",
               },
               {
                  // secure: true, requireTLS:true
                  name: "OKTA",
                  value: "OKTA",
                  short: "OKTA",
               },
            ],
            message: "Authentication type:",
            default: "login",
            when: (values) => {
               return !values.authType && !Options.authType;
            },
         },
         {
            name: "casBaseURL",
            type: "input",
            message: "CAS Base Url:",
            default: "https://my_cas.server.com/cas",
            filter: (input) => {
               if (input == "https://my_cas.server.com/cas") {
                  return "";
               }
               return input;
            },
            validate: (input) => {
               return input && input !== "https://my_cas.server.com/cas";
            },
            when: (values) => {
               return (
                  (values.authType == "CAS" || Options.authType == "CAS") &&
                  !values.casBaseURL &&
                  !Options.casBaseURL
               );
            },
         },
         {
            name: "casUUIDKey",
            type: "input",
            message: "CAS UUID Key:",
            default: "uuid",
            filter: (input) => {
               if (input == "uuid") {
                  return "";
               }
               return input;
            },
            validate: (input) => {
               return input && input !== "uuid";
            },
            when: (values) => {
               return (
                  (values.authType == "CAS" || Options.authType == "CAS") &&
                  !values.casUUIDKey &&
                  !Options.casUUIDKey
               );
            },
         },
         {
            name: "oktaDomain",
            type: "input",
            message: "OKTA Domain:",
            default: "https://my_okta.server.com",
            filter: (input) => {
               if (input == "https://my_okta.server.com") {
                  return "";
               }
               return input;
            },
            validate: (input) => {
               return input && input !== "https://my_okta.server.com";
            },
            when: (values) => {
               return (
                  (values.authType == "OKTA" || Options.authType == "OKTA") &&
                  !values.oktaDomain &&
                  !Options.oktaDomain
               );
            },
         },
         {
            name: "oktaClientID",
            type: "input",
            message: "OKTA Client ID:",
            when: (values) => {
               return (
                  (values.authType == "OKTA" || Options.authType == "OKTA") &&
                  !values.oktaClientID &&
                  !Options.oktaClientID
               );
            },
         },
         {
            name: "oktaClientSecret",
            type: "input",
            message: "OKTA Client Secret:",
            when: (values) => {
               return (
                  (values.authType == "OKTA" || Options.authType == "OKTA") &&
                  !values.oktaClientSecret &&
                  !Options.oktaClientSecret
               );
            },
         },
         {
            name: "siteURL",
            type: "input",
            message: "Enter the URL for the auth service redirect:",
            default: "https://this.server.com",
            when: (values) => {
               return (
                  values.authType != "local" &&
                  Options.authType != "local" &&
                  !values.siteURL &&
                  !Options.siteURL
               );
            },
         },

         //
         // RELAY Server
         //
         {
            name: "relayEnabled",
            type: "confirm",
            message: "Do you want to enable the RELAY service :",
            default: false,
            when: (values) => {
               return (
                  typeof values.relayEnabled == "undefined" &&
                  typeof Options.relayEnabled == "undefined"
               );
            },
         },
         {
            name: "relayServerURL",
            type: "input",
            message: "Enter the URL for the relay server:",
            default: "https://relay.server.com",
            filter: (input) => {
               if (input == "https://relay.server.com") {
                  return "";
               }
               return input;
            },
            when: (values) => {
               return (
                  (values.relayEnabled || Options.relayEnabled) &&
                  !values.relayServerURL &&
                  !Options.relayServerURL
               );
            },
         },
         {
            name: "relayServerToken",
            type: "input",
            message: "Enter the relay server auth token:",
            when: (values) => {
               return (
                  (values.relayEnabled || Options.relayEnabled) &&
                  !values.relayServerToken &&
                  !Options.relayServerToken
               );
            },
         },
         {
            name: "pwaURL",
            type: "input",
            message:
               "Enter the url to download the mobile progressive web app:",
            default: "https://mobile.my-site.com/pwa",
            filter: (input) => {
               if (input == "https://mobile.my-site.com/pwa") {
                  return "";
               }
               return input;
            },
            when: (values) => {
               return (
                  (values.relayEnabled || Options.relayEnabled) &&
                  !values.pwaURL &&
                  !Options.pwaURL
               );
            },
         },
      ])
      .then((answers) => {
         for (var a in answers) {
            Options[a] = answers[a];
         }
         // make sure dbPort has a default value before generating Files:
         if (!Options.dbExpose) {
            Options.dbPort = "8899";
         }

         if (Options.authType != "CAS") {
            Options.casEnabled = false;
            Options.casBaseURL = "";
            Options.casUUIDKey = "";
         } else {
            Options.casEnabled = true;
         }

         if (Options.authType != "OKTA") {
            Options.oktaEnabled = false;
            Options.oktaDomain = "";
            Options.oktaClientID = "";
            Options.oktaClientSecret = "";
         } else {
            Options.oktaEnabled = true;
         }

         if (Options.authType == "local") {
            Options.siteURL = "";
         }

         if (!Options.relayEnabled) {
            Options.relayServerURL = "";
            Options.relayServerToken = "";
            Options.pwaURL = "";
         }

         let settingTags = Promise.resolve();
         // set the docker tags from version.json in runtime
         if (Options.tag === "latest") {
            settingTags = new Promise((resolve) => {
               fs.readFile(
                  path.join(process.cwd(), "version.json"),
                  "utf8",
                  function (err, data) {
                     if (err) throw err;
                     const versions = JSON.parse(data);
                     const services = Object.keys(versions.services);
                     for (let i = 0; i < services.length; i++) {
                        const service = services[i];
                        Options[`tag_${service}`] = versions.services[service];
                     }
                     resolve();
                  }
               );
            });
         }

         Options.sailsSessionSecret = nanoid(32);

         Options.cypressBaseURL = `http://localhost:${Options.port ?? 80}`;
         Options.cypressStack = Options.stack ?? "ab";

         // console.log("Options:", Options);
         settingTags.then(done);
      })
      .catch(done);
}

/**
 * @function copyTemplateFiles
 * copy our template files into the project
 * @param {cb(err)} done
 */
function copyTemplateFiles(done) {
   utils.fileCopyTemplates("setup", Options, [], done);
}

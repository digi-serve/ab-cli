//
// setup
// create the local config options for the AppBuilder runtime.
//
// options:
//  --port : the port to listen on for the local system
//  --tag  : the docker tag of the images to run
//
var async = require("async");
var fs = require("fs");
var inquirer = require("inquirer");
var path = require("path");
var utils = require(path.join(__dirname, "utils", "utils"));

var Options = {}; // the running options for this command.

const GeneratedFiles = {
   // source file :  generated file
   "source.config-compose.yml": "config-compose.yml",
   "source.dbinit-compose.yml": "dbinit-compose.yml",
   "source.docker-compose.yml": "docker-compose.yml",
   "source.docker-compose.dev.yml": "docker-compose.dev.yml",
   "source.docker-compose.override.yml": "docker-compose.override.yml",
};
//
// Build the Command
//
var Command = new utils.Resource({
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
         return;
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
            questions,
            removeGeneratedFiles,
            generateFiles,
            copyTemplateFiles,
            patchDockerStack,
            setupNGINX,
            setupSSL,
            setupDB,
            setupBotManager,
            setupNotificationEmail,
            developerConversion,
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
         {
            name: "port",
            type: "input",
            message: "What port do you want AppBuilder to listen on (80):",
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
            name: "tag",
            type: "input",
            message: "Which Docker Tags to use [master, develop]:",
            default: "master",
            filter: (input) => {
               if (input == "") {
                  return "master";
               } else {
                  return input;
               }
            },
            validate: (input) => {
               return !input ||
                  ["master", "develop"].indexOf(input.toLowerCase()) != -1
                  ? true
                  : `"master" or "develop"`;
            },
            when: (values) => {
               return !values.tag && !Options.tag;
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
         // console.log("Options:", Options);
         done();
      })
      .catch(done);
}

/**
 * @function removeGeneratedFiles
 * Remove any generated files
 * @param {cb(err)} done
 */
function removeGeneratedFiles(done) {
   var generatedFiles = Object.keys(GeneratedFiles).map((k) => {
      return GeneratedFiles[k];
   });
   var cwd = process.cwd();
   async.each(
      generatedFiles,
      (file, cb) => {
         var pathFile = path.join(cwd, file);
         fs.unlink(pathFile, (err) => {
            if (err) {
               // console.log(err);
            }
            cb();
         });
      },
      (err) => {
         done(err);
      }
   );
}

/**
 * @function generateFiles
 * generate files
 * @param {cb(err)} done
 */
function generateFiles(done) {
   var sourceFiles = Object.keys(GeneratedFiles);
   var cwd = process.cwd();

   var nonExposeDBTag = /\s{2}db:\n\s*ports:\s*\n\s*-/;
   var nonExposeDBReplace = `  # db:
    # ports:
    #   -`;

   if (Options.develop) {
      Options.configImage = "node";
      Options.configBind = `
      - type: bind
        source: ./developer/config
        target: /app
`;
   } else {
      // TODO: replace this with the actual service image
      Options.configImage = `digiserve/ab-config:${Options.tag}`;
      Options.configBind = "";
   }

   async.each(
      sourceFiles,
      (file, cb) => {
         // render the source files
         var pathSourceFile = path.join(cwd, file);
         var contents = utils.fileRender(pathSourceFile, Options);

         if (!Options.dbExpose) {
            contents = contents.replace(nonExposeDBTag, nonExposeDBReplace);
         }

         // write them to the destination files
         var pathFile = path.join(cwd, GeneratedFiles[file]);
         fs.writeFile(pathFile, contents, (err) => {
            if (err) {
               console.log(err);
            }
            cb(err);
         });
      },
      (err) => {
         done(err);
      }
   );
}

/**
 * @function copyTemplateFiles
 * copy our template files into the project
 * @param {cb(err)} done
 */
function copyTemplateFiles(done) {
   utils.fileCopyTemplates("setup", { stack: Options.stack }, [], done);
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
            file: path.join(process.cwd(), "package.json"),
            tag: / ab/g,
            replace: ` ${Options.stack || "ab"}`,
            log: `    Docker Stack: package.json => ${Options.stack || "ab"}`,
         },
         {
            file: path.join(process.cwd(), "package.json"),
            tag: /test_ab/g,
            replace: `test_${Options.stack || "ab"}`,
            log: `    Docker Stack: package.json => test_${
               Options.stack || "ab"
            }`,
         },
         {
            file: path.join(process.cwd(), "cli.sh"),
            tag: /ab_/g,
            replace: `${Options.stack || "ab"}_`,
            log: `    Docker Stack: logs.js => ${Options.stack || "ab"}`,
         },
         {
            file: path.join(process.cwd(), "Down.sh"),
            tag: / ab/g,
            replace: ` ${Options.stack || "ab"}`,
            log: `    Docker Stack: Down.sh => ${Options.stack || "ab"}`,
         },
         {
            file: path.join(process.cwd(), "logs.js"),
            tag: /ab_/g,
            replace: `${Options.stack || "ab"}_`,
            log: `    Docker Stack: logs.js => ${Options.stack || "ab"}`,
         },
         {
            file: path.join(process.cwd(), "UP.sh"),
            tag: / ab/g,
            replace: ` ${Options.stack || "ab"}`,
            log: `    Docker Stack: UP.sh => ${Options.stack || "ab"}`,
         },
         {
            file: path.join(process.cwd(), "configReset.sh"),
            tag: / ab/g,
            replace: ` ${Options.stack || "ab"}`,
            log: `    Docker Stack: configReset.sh => ${Options.stack || "ab"}`,
         },
         {
            file: path.join(process.cwd(), "testReset.sh"),
            tag: /_ab/g,
            replace: `_${Options.stack || "ab"}`,
            log: `    Docker Stack: testReset.sh => ${Options.stack || "ab"}`,
         },
      ],
      done
   );
}

/**
 * @function setupNGINX
 * run the nginx setup command.
 * @param {cb(err)} done
 */
function setupNGINX(done) {
   var nginxCommand = require(path.join(__dirname, "tasks", "configNginx.js"));

   // scan Options for nginx related options:
   var nginxOptions = Options.nginx || {};

   // pass port into nginxOptions in case they want to use NGINX
   nginxOptions.port = Options.port;

   nginxCommand
      .run(nginxOptions)
      .then((opts) => {
         Options.nginxEnable = opts.enable;
         done();
      })
      .catch(done);
}

/**
 * @function setupSSL
 * run the ssl setup command.
 * @param {cb(err)} done
 */
function setupSSL(done) {
   if (!Options.nginxEnable) done();

   var sslCommand = require(path.join(__dirname, "ssl.js"));

   // scan Options for ssl related options:
   // "ssl.self"
   // "ssl.pathKey ssl.pathCert"
   // "ssl.none"
   var sslOptions = Options.ssl || {};
   for (var o in Options) {
      var parts = o.split(".");
      if (parts[0] == "ssl" && parts[1]) {
         sslOptions[parts[1]] = Options[o];
      }
   }

   sslCommand.run(sslOptions).then(done).catch(done);
}

/**
 * @function setupBotManager
 * run the configBotManager setup command.
 * @param {cb(err)} done
 */
function setupBotManager(done) {
   var botManagerCommand = require(path.join(
      __dirname,
      "tasks",
      "configBotManager.js"
   ));

   // scan Options for bot_manager related options:
   // "bot.dhEnabled, bot.dhPort"
   // "bot.botEnable, bot.botToken, bot.botName, bot.slackChannel"
   // "bot.hosttcpport"
   var botOptions = {
      dhEnable: false,
      dhPort: 14000,
      dockerTag: Options.tag,
   };

   // capture any existing .bot values:
   if (Options.bot) {
      for (var b in Options.bot) {
         botOptions[b] = Options.bot[b];
      }
   }

   // find any possible "bot.param" values
   for (var o in Options) {
      var parts = o.split(".");
      if (parts[0] == "bot" && parts[1]) {
         botOptions[parts[1]] = Options[o];
      }
   }

   botManagerCommand.run(botOptions).then(done).catch(done);
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

   // find any possible "db.param" values
   for (var o in Options) {
      var parts = o.split(".");
      if (parts[0] == "db") {
         dbOptions[parts[1]] = Options[o];
      }
   }

   configDBCommand.run(dbOptions).then(done).catch(done);
}

/**
 * @function setupNotificationEmail
 * run the configNotificationEmail setup command.
 * @param {cb(err)} done
 */
function setupNotificationEmail(done) {
   var notificationEmailCommand = require(path.join(
      __dirname,
      "tasks",
      "configNotificationEmail.js"
   ));

   // scan Options for smtp related options:
   // smtp.smtpEnabled
   // smtp.smtpHost,
   // smtp.smtpTLS
   // smtp.smtpPort
   // smtp.smtpAuth, smtp.smtpAuthUser, smtp.smtpAuthPass
   var emailOptions = Options.smtp || {};

   for (var o in Options) {
      var parts = o.split(".");
      if (parts[0] == "smtp" && parts[1]) {
         emailOptions[parts[1]] = Options[o];
      }
   }

   notificationEmailCommand.run(emailOptions).then(done).catch(done);
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
         ],
         done
      );
   } else {
      done();
   }
}

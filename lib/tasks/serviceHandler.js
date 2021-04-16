//
// serviceHandler
// create a new service handler in the developer/[service]/handler directory.
//
// options:
//
//
var async = require("async");
var fs = require("fs");
var inquirer = require("inquirer");
var path = require("path");
var shell = require("shelljs");
var utils = require(path.join(__dirname, "..", "utils", "utils"));

var Options = {}; // the running options for this command.

//
// Build the Install Command
//
var Command = new utils.Resource({
   command: "serviceHandler",
   params: "",
   descriptionShort:
      "create a new service handler in the developer/[service]/handler directory.",
   descriptionLong: `
`
});

module.exports = Command;

Command.help = function() {
   console.log(`

  usage: $ appbuilder service handler [service] [action] [key]

  create a new service in [root]/developer/[service]/handlers/[action].js

  Options:
    [service] the name of the service this handler is for.
    [action]  the action name of the handler
    [key]     the cote reference key for this handler.
              default: [service].[action]
    --useABObjects : this service handler uses ABObject instances

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

               // if they are just asking for help, then show the help.
               if (options.help) {
                  Command.help();
                  process.exit();
                  return;
               }

               Options._ = Options._ || [];

               var optionOrder = ["service", "action", "key"];

               while (Options._.length > 0 && optionOrder.length > 0) {
                  var key = optionOrder.shift();
                  var value = Options._.shift();
                  Options[key] = value;
               }

               done();
            },
            checkDependencies,
            findAllServices,
            questions,
            copyTemplateFiles,
            installABSubmodule,
            npmInstallPackages
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
 * verify the system has any required dependencies for generating ssl certs.
 * @param {function} done  node style callback(err)
 */
function checkDependencies(done) {
   utils.checkDependencies([], done);
}

/**
 * @function copyTemplateFiles
 * copy our template files into the project
 * @param {cb(err)} done
 */
function copyTemplateFiles(done) {
   // key, action, service:

   var template = "serviceHandler";
   if (Options.useABObjects) {
      template = "serviceHandlerAB";
   }
   utils.fileCopyTemplates(template, Options, [], done);
}

/**
 * @function installABSubmodule
 * determine if the ab_platform_service sub module should exist and install
 * it if necessary.
 * @param {cb(err)} done
 */
function installABSubmodule(done) {
   if (Options.useABObjects) {
      var pathService = path.join(process.cwd(), "developer", Options.service);
      var pathAB = path.join(pathService, "AppBuilder");
      if (!fs.existsSync(pathAB)) {
         // if we don't have our AppBuilder directory, install it
         utils.gitSubmoduleAdd(
            pathService,
            "https://github.com/appdevdesigns/appbuilder_platform_service.git",
            "AppBuilder",
            (err) => {
               done(err);
            }
         );
         return;
      }
      done();
      return;
   }
   done();
}

/**
 * @function findAllServices
 * Pull out all the services in the developer/ directory.
 * @param {cb(err)} done
 */
function findAllServices(done) {
   Options._allServices = utils.findAllServices();
   done();
}

/**
 * @function npmInstallPackages
 * Install any missing npm packages that are expected when we use our AB
 * submodule
 * @param {cb(err)} done
 */
function npmInstallPackages(done) {
   if (Options.useABObjects) {
      shell.pushd("-q", path.join(process.cwd(), "developer", Options.service));
      shell.exec(`npm install --save --force knex moment objection xml-js`);
      shell.popd();
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
            name: "service",
            type: "list",
            message: "Which service is this for :",
            choices: Options._allServices,
            default: Options._allServices[0],
            when: (values) => {
               return !values.service && typeof Options.service == "undefined";
            }
         },
         {
            name: "action",
            type: "input",
            message: "Enter the action name :",
            default: "",
            validate: (input) => {
               return input != ""
                  ? true
                  : "enter a valid action key (create, upload, etc...) ";
            },
            when: (values) => {
               return !values.action && typeof Options.action == "undefined";
            }
         },
         {
            name: "key",
            type: "input",
            message: "Enter the service key :",
            default: (values) => {
               return `${values.service || Options.service}.${values.action ||
                  Options.action}`;
            },
            when: (values) => {
               return !values.key && typeof Options.key == "undefined";
            }
         },
         {
            name: "useABObjects",
            type: "confirm",
            message: "Will this service work with instances of ABObjects? :",
            default: false,

            when: (values) => {
               return (
                  !values.useABObjects &&
                  typeof Options.useABObjects == "undefined"
               );
            }
         }
      ])
      .then((answers) => {
         for (var a in answers) {
            Options[a] = answers[a];
         }
         // console.log("Options:", Options);
         done();
      })
      .catch(done);
}

//
// serviceHandler
// create a new service handler in the developer/[service]/handler directory.
//
// options:
//
//
var async = require("async");
var inquirer = require("inquirer");
var path = require("path");
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
            copyTemplateFiles
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

   utils.fileCopyTemplates("serviceHandler", Options, [], done);
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

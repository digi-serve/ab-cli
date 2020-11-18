//
// apiNew
// create a new API end point for a micro service.
//
// options:
//
//
var async = require("async");
var fs = require("fs");
var inquirer = require("inquirer");
var path = require("path");
var utils = require(path.join(__dirname, "..", "utils", "utils"));

var Options = {}; // the running options for this command.

//
// Build the Install Command
//
var Command = new utils.Resource({
   command: "apiNew",
   params: "",
   descriptionShort: "create a new API end point for a micro service.",
   descriptionLong: `
`
});

module.exports = Command;

Command.help = function() {
   console.log(`

  usage: $ appbuilder api new [service] [action] [verb] [route] [key]

  create a new API end point for a micro service.

  Options:
    [service] (optional) the name of the micro service.
    [action]  (optional) the name of the action for this service.
    [verb]    (optional) the http verb of this route
    [route]   (optional) the sails route string (/service/action/:param1)
    [key]     (optional) the service key (file.upload, image.scale, etc... )

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

               var optionOrder = ["service", "action", "verb", "route", "key"];

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
            createServiceHandler,
            patchRoutes,
            patchServiceApp
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
   utils.checkDependencies(["git"], done);
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
 * @function copyTemplateFiles
 * copy our template files into the project
 * @param {cb(err)} done
 */
function copyTemplateFiles(done) {
   utils.fileCopyTemplates("apiNew", Options, [], done);
}

function createServiceHandler(done) {
   const serviceHandler = require(path.join(__dirname, "serviceHandler"));
   serviceHandler
      .run({
         service: Options.service,
         action: Options.action,
         key: Options.key
      })
      .then(done)
      .catch(done);
}

/**
 * @function patchRoutes
 * insert the api_sails route definition
 * @param {cb(err)} done
 */
function patchRoutes(done) {
   var pathRoutes = path.join(
      process.cwd(),
      "developer",
      "api_sails",
      "config",
      "routes.js"
   );

   var tag = new RegExp(`//\\s*${Options.service}\\s*routes:`);
   var replaceWith = `// ${Options.service} routes:
   "${Options.verb}${Options.verb != "" ? " " : ""}${Options.route}": "${
      Options.service
   }/${Options.action}",`;

   var contents = fs.readFileSync(pathRoutes, "utf8");

   var serviceExp = new RegExp(`//\\s*${Options.service}\\s*routes:`, "g");
   if (!serviceExp.exec(contents)) {
      tag = /};/;
      replaceWith = `   ${replaceWith}

};`;
   }

   utils.filePatch(
      [
         // patch our config/local.js
         {
            file: pathRoutes,
            // tag: /bot_manager:\s*{[\w\d\s\S]*?},\s*\/\*\*/,
            tag: tag,
            replace: replaceWith,
            log: ""
         }
      ],
      done
   );
}

/**
 * @function patchServiceApp
 * insert the handler into the Service/app.js
 * @param {cb(err)} done
 */
function patchServiceApp(done) {
   var pathApp = path.join(
      process.cwd(),
      "developer",
      Options.service,
      "app.js"
   );

   var replaceDefinition = `const ABService = AB.service;

const ${Options.action}Handler = require(path.join(__dirname, "src", "${Options.action}.js"));
${Options.action}Handler.init({ config });`;

   var replaceShutdown = `shutdown() {
    serviceResponder.off("${Options.key}", ${Options.action}Handler.fn);`;

   var replaceRun = `run() {
    serviceResponder.on("${Options.key}", ${Options.action}Handler.fn);`;

   utils.filePatch(
      [
         // patch our [service]/app.js
         {
            file: pathApp,
            // tag: /bot_manager:\s*{[\w\d\s\S]*?},\s*\/\*\*/,
            tag: /const\s*ABService\s*=\s*AB.service;*/,
            replace: replaceDefinition,
            log: ""
         },
         {
            file: pathApp,
            // tag: /bot_manager:\s*{[\w\d\s\S]*?},\s*\/\*\*/,
            tag: /shutdown\s*\(\s*\)\s*{/,
            replace: replaceShutdown,
            log: ""
         },
         {
            file: pathApp,
            // tag: /bot_manager:\s*{[\w\d\s\S]*?},\s*\/\*\*/,
            tag: /run\s*\(\s*\)\s*{/,
            replace: replaceRun,
            log: ""
         }
      ],
      done
   );
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
            name: "verb",
            type: "list",
            message: "What http verb for this api :",
            choices: [
               { value: "get", name: "get    (Read)" },
               { value: "post", name: "post   (Create)" },
               { value: "put", name: "put    (Update)" },
               { value: "delete", name: "delete" },
               { value: "all", name: "all routes" }
            ],
            default: "all",
            filter: (input) => {
               if (input == "all") {
                  input = "";
               }
               return input;
            },
            when: (values) => {
               return !values.verb && typeof Options.verb == "undefined";
            }
         },
         {
            name: "route",
            type: "input",
            message: "Enter the sails route definition :",
            default: (values) => {
               return `/${values.service ||
                  Options.service ||
                  "service"}/${values.action || Options.action || "action"}`;
            },
            filter: (input) => {
               if (input[0] != "/") {
                  input = "/" + input;
               }
               return input;
            },
            when: (values) => {
               return !values.route && typeof Options.route == "undefined";
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

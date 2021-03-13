//
// serviceNew
// create a new service in the developer/ directory.
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
   command: "serviceNew",
   params: "",
   descriptionShort: "create a new service in developer/ directory.",
   descriptionLong: `
`
});

module.exports = Command;

Command.help = function() {
   console.log(`

  usage: $ appbuilder service new [name]

  create a new service in [root]/developer/[name]

  Options:
    [name] the name of the service to create.

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

               Options.name = Options._.shift();
               if (!Options.name) {
                  console.log("missing parameter [name]");
                  Command.help();
                  process.exit(1);
               }
               done();
            },
            checkDependencies,
            questions,
            copyTemplateFiles,
            createInitialAPI,
            insertComposeDevSharedFiles,
            installGitDependencies,
            installABPlatform
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
 * @function copyTemplateFiles
 * copy our template files into the project
 * @param {cb(err)} done
 */
function copyTemplateFiles(done) {
   var parts = Options.name.split("_");
   for (var p = 0; p < parts.length; p++) {
      parts[p] = parts[p].charAt(0).toUpperCase() + parts[p].slice(1);
   }
   //    Options.className = parts.join("");
   Options.serviceName = Options.name;
   // Options.className.charAt(0).toLowerCase() + Options.className.slice(1);
   Options.containerName = utils.stringReplaceAll(Options.name, "_", "-");

   utils.fileCopyTemplates("serviceNew", Options, [], done);
}

/**
 * @function createInitialAPI
 * create the initial API endpoint if one was requested
 * @param {cb(err)} done
 */
function createInitialAPI(done) {
   if (Options.shouldInstallAPI) {
      const apiNew = require(path.join(__dirname, "apiNew"));
      apiNew
         .run({
            service: Options.name
         })
         .then(done)
         .catch(done);

      return;
   }
   done();
}

/**
 * @function installGitDependencies
 * install our initial git dependencies.
 * @param {cb(err)} done
 */
function installGitDependencies(done) {
   shell.pushd("-q", path.join(process.cwd(), "developer", Options.name));

   // init git repo
   shell.exec(`git init`);

   console.log("... npm install (this takes a while)");
   utils.execCli("npm install");

   shell.popd();
   done();
}

/**
 * @function insertComposeDevSharedFiles
 * if service requires access to shared files, include our /data directory
 * in our docker-compose.yml definitions.
 * @param {cb(err)} done
 */
function insertComposeDevSharedFiles(done) {
   var fileSharing = "  #/[serviceName]";
   var devSharing = "  #/[serviceName]";
   if (Options.serviceSharedFiles) {
      fileSharing = `      - type: bind
  #       source: ./data
  #       target: /data
  # #/[serviceName]
`;
      devSharing = `      - type: bind
        source: ./data
        target: /data
  #/[serviceName]
`;
   }

   // package the docker-compose.yml entry for this new service
   var configContents = fs.readFileSync(
      path.join(utils.fileTemplatePath(), "_service.dockercompose.yml")
   );
   configContents = configContents.toString();
   configContents = utils.stringReplaceAll(
      configContents,
      "  #/[serviceName]",
      fileSharing
   );
   var configEntry = utils.stringRender(configContents, Options);

   // package the docker-compose.dev.yml entry for this new service
   var devContents = fs.readFileSync(
      path.join(utils.fileTemplatePath(), "_service.dockercompose.dev.yml")
   );
   devContents = devContents.toString();
   devContents = utils.stringReplaceAll(
      devContents,
      "  #/[serviceName]",
      devSharing
   );
   var devEntry = utils.stringRender(devContents, Options);

   // queue up all the file + append combos for these entries.
   var updateConfigs = [
      { src: "docker-compose.yml", append: configEntry },
      { src: "source.docker-compose.yml", append: configEntry },
      { src: "docker-compose.dev.yml", append: devEntry },
      { src: "source.docker-compose.dev.yml", append: devEntry }
   ];

   async.each(
      updateConfigs,
      (entry, cb) => {
         var contents;
         var filePath = path.join(process.cwd(), entry.src);
         async.series(
            [
               (next) => {
                  fs.readFile(filePath, (err, data) => {
                     contents = data;
                     next(err);
                  });
               },
               (next) => {
                  contents += entry.append;
                  fs.writeFile(filePath, contents, (err) => {
                     next(err);
                  });
               }
            ],
            (e) => {
               cb(e);
            }
         );
      },
      (err) => {
         done(err);
      }
   );
}

/**
 * @function installABPlatform
 * Install the ab_platform_service submodule if this service is expected
 * to work with instances of AppBuilder objects.
 * @param {cb(err)} done
 */
function installABPlatform(done) {
   if (Options.useABObjects) {
      var dirName = path.join(process.cwd(), "developer", Options.name);
      utils.gitSubmoduleAdd(
         dirName,
         "https://github.com/appdevdesigns/appbuilder_platform_service.git",
         "AppBuilder",
         (err) => {
            done(err);
         }
      );
      return;
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
            name: "description",
            type: "input",
            message: "Describe this service :",
            default: "A cool micro service.",
            when: (values) => {
               return (
                  !values.description &&
                  typeof Options.description == "undefined"
               );
            }
         },
         {
            name: "author",
            type: "input",
            message: "Enter your name (name of the author) :",
            default: "Coding Monkey",
            when: (values) => {
               return !values.author && typeof Options.author == "undefined";
            }
         },
         // {
         //    name: "serviceKey",
         //    type: "input",
         //    message:
         //       'Enter the service bus key ("[subject].[action]" like notification.email) :',
         //    default: "",
         //    validate: (input) => {
         //       return input != "" && input.indexOf(".") > -1
         //          ? true
         //          : "enter a key in format: [subject].[action]";
         //    },
         //    when: (values) => {
         //       return (
         //          !values.serviceKey && typeof Options.serviceKey == "undefined"
         //       );
         //    }
         // },
         {
            name: "serviceSharedFiles",
            type: "confirm",
            message: "Does this service need access to shared files? :",
            default: false,

            when: (values) => {
               return (
                  !values.serviceSharedFiles &&
                  typeof Options.serviceSharedFiles == "undefined"
               );
            }
         },
         {
            name: "shouldInstallAPI",
            type: "confirm",
            message: "Create an initial API endpoint for this service? :",
            default: false,

            when: (values) => {
               return (
                  !values.shouldInstallAPI &&
                  typeof Options.shouldInstallAPI == "undefined"
               );
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

/**
 * @function saveConfig
 * store our new configuration settings in our bot_manager:{} settings.
 * @param {cb(err)} done
 */
// function saveConfig(done) {
//   var jsonConfig = JSON.stringify(Config, null, 2);

//   // indent the new data
//   jsonConfig = utils.stringReplaceAll(jsonConfig, "\n", "\n  ");

//   // wrap in bot_manager: {}
//   jsonConfig = `bot_manager: ${jsonConfig},
//   /* end bot_manager */`;

//   var newTriggers = `"triggers": [
//       { search: /skipdaddy\\/.*:${Options.dockerTag ||
//         "mast3r"}/, command: "update", options: {} }
//     ]`;

//   utils.filePatch(
//     [
//       // patch our config/local.js
//       {
//         file: path.join(process.cwd(), "config", "local.js"),
//         // tag: /bot_manager:\s*{[\w\d\s\S]*?},\s*\/\*\*/,
//         tag: /bot_manager:\s*{[\w\d\s\S]*?},*\s*\/\*\s*end\s*bot_manager\s*\*\//,
//         replace: jsonConfig,
//         log: ""
//       },
//       // patch the triggers definition:
//       {
//         file: path.join(process.cwd(), "config", "local.js"),
//         tag: /"*triggers"*:\s*\[\s*{\s*"*new"*\s*:\s*"trigger"\s*}\s*\]/,
//         replace: newTriggers,
//         log: ""
//       }
//     ],
//     done
//   );
// }

//
// testSetup
// make sure our environment is prepared for running tests.
//
// options:
//
//
var async = require("async");
// var inquirer = require("inquirer");
var path = require("path");
var shell = require("shelljs");
var utils = require(path.join(__dirname, "..", "utils", "utils"));

var Options = {}; // the running options for this command.

//
// Build the Install Command
//
var Command = new utils.Resource({
   command: "testSetup",
   params: "",
   descriptionShort: "prepare our environment for running tests.",
   descriptionLong: `
`,
});

module.exports = Command;

Command.help = function () {
   console.log(`

  usage: $ appbuilder test setup [stack]

  prepare our environment for running tests.

  Options:
    [stack] the name of the docker stack we are referencing.

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

               Options.stack = options._.shift();
               if (!Options.stack) {
                  console.log("missing required param: [stack]");
                  Command.help();
                  process.exit(1);
               }
               Options.stack = `test_${Options.stack}`;
               done();
            },
            checkDependencies,
            checkExistingVolume,
            // NOTE: if a volume is already created, the process
            // exits here and doesn't continue.

            generateTestConfigs,
            createMissingVolume,
            removeSetupStack,
            waitClosed,
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
   utils.checkDependencies(["docker"], done);
}

/**
 * @function checkExistingVolume
 * check to see if our testing volume is already created. If it is, we don't
 * have to do this.
 * @param {function} done  node style callback(err)
 */
function checkExistingVolume(done) {
   var response = shell.exec(
      `docker volume ls | grep ${Options.stack}_mysql_data`,
      {
         silent: true,
      }
   );
   if (response.stdout != "") {
      console.log(
         `a test data volume [${Options.stack}] has already been created.`
      );
      process.exit(0);
   }
   done();
}

/**
 * @function createMissingVolume
 * Build the initial testing volume
 * @param {function} done  node style callback(err)
 */
function createMissingVolume(done) {
   console.log('Create Test Volume');
   utils
      .dbInit({
         dbVolume: "keep",
         stack: Options.stack,
         keepRunning: true,
         hidePorts: true,
      })
      .then(() => {
         done();
      })
      .catch(done);
}

/**
 * @function generateTestConfigs
 * Build a set of testing config volumes
 * @param {function} done  node style callback(err)
 */
function generateTestConfigs(done) {
   console.log('Generate Test Configs');
   utils
      .configInit({
         dbVolume: "keep",
         stack: Options.stack,
         nginxEnable: true,
      })
      .then(() => {
         done();
      })
      .catch(done);
}

/**
 * @function removeSetupStack
 * issue the docker command to remove the setup stack
 * @param {function} done  node style callback(err)
 */
function removeSetupStack(done) {
   console.log(`Remove Setup Stack`);
   shell.exec(`docker stack rm ${Options.stack}`, {
      silent: true,
   });
   done();
}

/**
 * @function waitClosed
 * wait for our stack to close before exiting.
 * @param {function} done  node style callback(err)
 */
function waitClosed(done) {
   var response = shell.exec(`docker stack ls | grep ${Options.stack}`, {
      silent: true,
   });
   if (response.stdout != "") {
      // stack is found so:

      setTimeout(() => {
         waitClosed(done);
      }, 1000);
   } else {
      done();
   }
}

/**
 * @function questions
 * Present the user with a list of configuration questions.
 * If the answer for a question is already present in Options, then we
 * skip that question.
 * @param {cb(err)} done
 */
/*
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
            },
         },
         {
            name: "author",
            type: "input",
            message: "Enter your name (name of the author) :",
            default: "Coding Monkey",
            when: (values) => {
               return !values.author && typeof Options.author == "undefined";
            },
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
            },
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
            },
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
            },
         },
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
*/

//
// addTests
// Adds test repos
//
// options:
//
//
const async = require("async");
const inquirer = require("inquirer");
const path = require("path");
const utils = require(path.join(__dirname, "..", "utils", "utils"));
const fs = require("fs");

var Options = {}; // the running options for this command.

const testOptions = [
   {
      name: "Kitchen Sink",
      value: "kitchensink_app",
   },
   {
      name: "CARS",
      value: "cars_app",
   },
   {
      name: "Well Database",
      value: "well_app",
   },
   {
      name: "NS",
      value: "ns_app",
   },
];
const testsToAdd = [];
const pathToIntegrationsFolder = path.resolve(
   process.cwd(),
   "test",
   "e2e",
   "cypress",
   "integration"
);
let token = "";
//
// Build the Install Command
//
var Command = new utils.Resource({
   command: "add",
   params: "",
   descriptionShort:
      "Clones test repositories into test/e2e/cypress/integrations",
   descriptionLong: `
`,
});

module.exports = Command;

Command.help = function () {
   console.log(`

  usage: $ appbuilder test add

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

               done();
            },
            checkFolder,
            checkExisting,
            questions,
            cloneRepos,
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
 * Verify that the test path exists
 * @function checkFolder
 * @param {function} done  node style callback(err)
 */
function checkFolder(done) {
   console.log(`Check the tests folder exists`);
   try {
      if (fs.statSync(pathToIntegrationsFolder).isDirectory()) {
         console.log("   ... done\n");
         done();
      }
   } catch (e) {
      console.log(`Could not find the path ${pathToIntegrationsFolder}`);
      process.exit(1);
   }
}

/**
 * Check if the tests are already in the tests folder. Disables the ooption to install the exisiting tests.
 * @function checkingExisting
 * @param {function} done  node style callback(err)
 */
function checkExisting(done) {
   const contents = fs.readdirSync(pathToIntegrationsFolder);
   testOptions.forEach((item) => {
      if (contents.includes(item.value)) {
         item.disabled = "already installed";
      }
   });
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
            name: "tests",
            type: "checkbox",
            message: "Which tests do you want to add?",
            default: false,
            choices: testOptions,
         },
         {
            name: "token",
            type: "password",
            message:
               "A github personal access token is required to clone private repos.",
            when: (values) => values.tests.includes("ns_app"),
         },
      ])
      .then((answers) => {
         answers.tests.forEach((test) => {
            testsToAdd.push(test);
         });
         token = answers.token !== undefined ? `${answers.token}@` : token;
         done();
      })
      .catch(done);
}

/**
 * Clones the selected repos into the tests folder
 * @function cloneRepos
 * @param {function} done  node style callback(err)
 */
function cloneRepos(done) {
   const total = testsToAdd.length;
   let testNumber = 1;
   async.eachSeries(
      testsToAdd,
      (test, cb) => {
         console.log(`\n git clone ${test} ${testNumber}/${total}`);
         testNumber++;
         const gitURL = `https://${token}github.com/digi-serve/${test}.git`;
         utils.gitCheckout(pathToIntegrationsFolder, gitURL, test, cb);
      },
      done
   );
}

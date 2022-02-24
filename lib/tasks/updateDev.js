//
// updateDev
// Update code in the developer folder
//
// options:
//
//
const async = require("async");
const shell = require("shelljs");
const path = require("path");
const utils = require(path.join(__dirname, "..", "utils", "utils"));
const fs = require("fs");
const chalk = require("chalk");

var Options = {}; // the running options for this command.

const pathToDevFolder = path.resolve(process.cwd(), "developer");
const localRepos = [];
//
// Build the Install Command
//
var Command = new utils.Resource({
   command: "devUpdate",
   params: "",
   descriptionShort: "Update code in the developer folder",
   descriptionLong: `
`,
});

module.exports = Command;

Command.help = function () {
   console.log(`

  usage: $ appbuilder update dev

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
            checkLocalRepos,
            gitPull,
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
 * Verify that the developer path exists
 * @function checkFolder
 * @param {function} done  node style callback(err)
 */
function checkFolder(done) {
   console.log(`Check the developer folder exists`);
   try {
      if (fs.statSync(pathToDevFolder).isDirectory()) {
         console.log("   ... done\n");
         done();
      }
   } catch (e) {
      console.log(chalk.red(`Could not find the path ${pathToDevFolder}`));
      process.exit(1);
   }
}

/**
 * Find the repos in the developer folder including plugins
 * @function checkLocalRepos
 * @param {function} done  node style callback(err)
 */
function checkLocalRepos(done) {
   const contents = fs.readdirSync(pathToDevFolder, { withFileTypes: true });
   const pluginsPath = path.join(pathToDevFolder, "plugins");
   contents.forEach((item) => {
      if (!item.isDirectory()) return;
      if (item.name !== "plugins") {
         localRepos.push({
            name: item.name,
            path: path.join(pathToDevFolder, item.name),
         });
      } else {
         const plugins = fs.readdirSync(pluginsPath, { withFileTypes: true });
         plugins.forEach((plugin) => {
            if (!item.isDirectory()) return;
            localRepos.push({
               name: plugin.name,
               path: path.join(pluginsPath, plugin.name),
            });
         });
      }
   });
   done();
}

/**
 * Runs git pull in each repo
 * @function gitPull
 * @param {function} done  node style callback(err)
 */
function gitPull(done) {
   const total = localRepos.length;
   let pullNum = 1;
   async.eachSeries(
      localRepos,
      (repo, cb) => {
         console.log(
            `\ngit pull ${repo.name} ` + chalk.cyan(`${pullNum}/${total}`)
         );
         pullNum++;
         shell.cd(repo.path);
         shell.exec("git pull --recurse-submodules");
         cb();
      },
      done
   );
}

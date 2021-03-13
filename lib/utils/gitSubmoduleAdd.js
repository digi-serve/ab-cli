/**
 * @function gitSubmoduleAdd
 * add a git project as a submodule to the current project.
 * @param {string} pathDir path to the directory
 * @param {string} urlProject  the git project https://url to add
 * @param {string} nameInstallDir the name of the local directory to create.
 * @param {fn} cb node style callback(err, result) when this is finished.
 */
var path = require("path");
var execCommand = require(path.join(__dirname, "execCommand"));

module.exports = function(pathDir, urlProject, nameInstallDir, cb) {
   var cwd = process.cwd();
   process.chdir(pathDir);
   execCommand({
      command: "git",
      options: ["submodule", "add", urlProject, nameInstallDir],
      shouldEcho: false,
      textFilter: ["Cloning into"]
   })
      .then((/* code */) => {
         process.chdir(path.join(pathDir, nameInstallDir));
         return execCommand({
            command: "git",
            options: ["submodule", "init"],
            shouldEcho: false,
            textFilter: ["Cloning into"]
         });
      })
      .then((/* code */) => {
         return execCommand({
            command: "git",
            options: ["submodule", "update"],
            shouldEcho: false,
            textFilter: ["Cloning into"]
         });
      })
      .then((/* code */) => {
         process.chdir(cwd);
         cb();
      })
      .catch((err) => {
         process.chdir(cwd);
         cb(err);
      });
};

/**
 * @function gitCheckout
 * checkout a git project into a provided directory
 * @param {string} pathDir path to the directory
 * @param {string} urlProject  the git project https://url to checkout
 * @param {string} nameInstallDir the name of the local directory to create.
 * @param {fn} cb node style callback when this is finished.
 */
var path = require("path");
var execCommand = require(path.join(__dirname, "execCommand"));

module.exports = function(pathDir, urlProject, nameInstallDir, cb) {
    var cwd = process.cwd();
    process.chdir(pathDir);
    execCommand({
        command: "git",
        options: ["clone", "--recursive", urlProject, nameInstallDir],
        shouldEcho: true
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

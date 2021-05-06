/**
 * @function execCli
 * execute the given command from within a Docker Container.
 * @param {string} pathDir path to the directory
 * @param {string} urlProject  the git project https://url to add
 * @param {string} nameInstallDir the name of the local directory to create.
 * @param {fn} cb node style callback(err, result) when this is finished.
 */
var shell = require("shelljs");

module.exports = function (command) {
   console.log(`... Container(${command})`);

   // install npm modules
   if (process.platform == "win32") {
      shell.exec(
         `docker run --mount type=bind,source=%cd%,target=/app -w /app node ${command}`
      );
   } else {
      shell.exec(
         `docker run --mount type=bind,source="$(pwd)",target=/app -w /app node ${command}`
      );
   }
};

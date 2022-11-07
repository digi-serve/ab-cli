//
// runDbMigrations
// run the db migrations (using ab migration manager)
//
//
const shelljs = require("shelljs");
const path = require("path");
/**
 * run the db migrations (using ab migration manager).
 * Note: expects the options.stack to be running with db conatiner.
 * @param {object} options
 */
module.exports = function ({ stack, keepRunning /*, tag */ }) {
   const tag = "master"; // only have the master tag built currently
   const network = `${stack}_default`;
   const pathConfig = path.join(process.cwd(), "/config/local.js");

   shelljs.exec(
      `docker run -v ${pathConfig}:/app/config/local.js --network=${network} digiserve/ab-migration-manager:${tag} node app.js`
   );

   if (!keepRunning) {
      console.log("... shutting down");
      shelljs.exec(`docker stack rm ${stack}`, { silent: true });
   }
};
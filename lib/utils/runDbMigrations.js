//
// runDbMigrations
// run the db migrations (using ab migration manager)
//
//
const shelljs = require("shelljs");
// const path = require("path");
/**
 * run the db migrations (using ab migration manager).
 * Note: expects the options.stack to be running with db conatiner.
 * @param {object} options
 */
module.exports = function ({ stack, keepRunning, platform /*, tag */ }) {
   const cmd = platform === "podman" ? "podman" : "docker";
   const tag = "master"; // only have the master tag built currently
   const network = `${stack}_default`;
   const name = "run_db_migration_manager";

   console.log("   - pulling latest migration-manager");
   shelljs.exec(`${cmd} image pull digiserve/ab-migration-manager:${tag}`);

   shelljs.exec(
      `${cmd} run --env-file .env --network=${network} --name=${name} digiserve/ab-migration-manager:${tag} node app.js`
   );
   // cleanup migration manager
   shelljs.exec(`${cmd} stop ${name}`);
   shelljs.exec(`${cmd} rm ${name}`);

   if (!keepRunning) {
      console.log("... shutting down");
      shelljs.exec(`docker stack rm ${stack}`, { silent: true });
   }
};

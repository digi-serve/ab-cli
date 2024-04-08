/**
 * @function dbInit
 * start up docker with a simple db initialization routine to create the
 * initial DB tables.
 * @param {hash} Options
 *        the working hash of Option values provided by the calling routine.
 *        Options.stack {string}
 *          the docker stack reference we are using for this install.
 * @param {string} dbinitFileName
 *        the name of the docker compose file to use for initializing the
 *        databases.
 * @return {Promise}
 */
const async = require("async");
const inquirer = require("inquirer");
const path = require("path");
const shell = require("shelljs");
const logFormatter = require("./logFormatter");
const dockerStackWatch = require(path.join(__dirname, "dockerStackWatch.js"));
const filePatch = require(path.join(__dirname, "filePatch.js"));

const log = (msg) => logFormatter.log(msg, undefined, "    ");
const warn = (msg) => logFormatter.log(msg, "yellow");

function ProcessData(context, data) {
   data = data.toString();

   // this is helpful to know if mysql is up and running the 1st time
   if (data.indexOf("ready for connections.") > -1) {
      context.readyFound = true;
   }

   if (!context.initBegan) {
      if (data.indexOf("initdb.d/01-CreateDBs.sql") > -1) {
         context.initBegan = true;
         log("... initializing tables");
      }
   } else {
      if (data.indexOf("ready for connections.") > -1) {
         log("... init complete (db)");
         context.endTrigger.emit("done");
      }
   }
}

module.exports = function (Options, dbinitFileName = "dbinit-compose.yml") {
   Options.dbVolume =
      Options.dbVolume || (Options.db ? Options.db.volume : "-na-");
   var existingVolume = "";
   var skipInstall = false;
   var properDBVolume = ["keep", "remove"].indexOf(Options.dbVolume) > -1;
   var stack = Options.stack || "ab";
   var dataVolume = `${stack}_mysql_data`;
   const platform = Options.platform === "podman" ? "podman" : "docker";
   const silent = true;
   return new Promise((resolve, reject) => {
      async.series(
         [
            (done) => {
               // check for existing mysql_data volume
               existingVolume = shell
                  .exec(`${platform} volume ls`, { silent })
                  .grep(` ${dataVolume}`)
                  .stdout.replace(/\n*\r*/g, "");
               if (existingVolume == "") {
                  return done();
               }

               if (!properDBVolume) {
                  warn(
                     `    WARN: There is an existing data volume : ${dataVolume}`
                  );
                  warn(
                     "    WARN: This installer wont be able to overwrite the data."
                  );
                  warn(
                     "       This wont be a problem if the install data is the same as the previous install"
                  );
                  warn(
                     "       eg Admin email, Admin password, DB password, etc..."
                  );
               }
               inquirer
                  .prompt([
                     {
                        name: "dbVolume",
                        type: "list",
                        choices: [
                           {
                              // secure: false, ignoreTLS: true
                              name: `Keep the existing ${dataVolume} volume`,
                              value: "keep",
                              short: "keep",
                           },
                           {
                              // secure: false
                              name: `Remove/Rebuild ${dataVolume}`,
                              value: "remove",
                              short: "remove",
                           },
                        ],
                        message: "Do you want to:",
                        default: "keep",
                        when: (/* values */) => {
                           return !properDBVolume;
                        },
                     },
                  ])
                  .then((answers) => {
                     if (!properDBVolume) {
                        Options.dbVolume = answers.dbVolume;
                     }
                     skipInstall = Options.dbVolume == "keep";
                     done();
                  });
            },
            (done) => {
               //Comment out ports for test db init
               if (Options.hidePorts) {
                  const patch = [
                     {
                        file: path.join(process.cwd(), dbinitFileName),
                        tag: /image: mariadb\s*\n\s*ports:\s*\n\s*/g,
                        replace: `image: mariadb\n    # ports:\n    #   `,
                        log: "",
                     },
                  ];
                  filePatch(patch);
               }
               done();
            },
            (done) => {
               if (existingVolume == "" || skipInstall) {
                  return done();
               }

               var remove = shell.exec(`${platform} volume rm ${dataVolume}`, {
                  silent,
               }).stdout;
               if (remove.indexOf(dataVolume) > -1) {
                  return done();
               }
               skipInstall = true;
               warn(
                  "    WARN: that didn't go as expected.  You might have to manually remove"
               );
               warn("      the volume and try the installer again.");
               done();
            },
            (done) => {
               if (skipInstall) {
                  return done();
               }

               dockerStackWatch(Options, ProcessData, dbinitFileName)
                  .then(() => {
                     log("... db initialized.");
                     done();
                  })
                  .catch((err) => {
                     done(err);
                  });
            },
         ],
         (err) => {
            if (err) {
               return reject(err);
            }
            return resolve(skipInstall);
         }
      );
   });
};

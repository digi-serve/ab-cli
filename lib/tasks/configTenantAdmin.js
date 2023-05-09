//
// configTenantAdmin
// setup the initial Tenant Admin user
//
// options:
//
//
const async = require("async");
const fs = require("fs");
const inquirer = require("inquirer");
const { nanoid } = require("nanoid");
const path = require("path");
const shell = require("shelljs");
const utils = require(path.join(__dirname, "..", "utils", "utils"));

var Options = {}; // the running options for this command.

//
// Build the Install Command
//
var Command = new utils.Resource({
   command: "configTenantAdmin",
   params: "",
   descriptionShort: "setup the initial Tenant Admin user.",
   descriptionLong: `
`,
});

module.exports = Command;

Command.help = function () {
   console.log(`

  usage: $ appbuilder configTenantAdmin

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
            questions,
            createUpdateCommand,
            updateCommand,
            removeTempFiles,
            writeEnvironment,
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
 * @function questions
 * Present the user with a list of configuration questions.
 * If the answer for a question is already present in Options, then we
 * skip that question.
 * @param {cb(err)} done
 */
function questions(done) {
   // var platform = process.platform;

   inquirer
      .prompt([
         {
            name: "username",
            type: "input",
            message: "Enter the Tenant Administrator Username:",
            default: "admin",
            when: (values) => {
               return !values.username && !Options.username;
            },
         },
         {
            name: "password",
            type: "input",
            message: "Enter the Tenant Administrator password:",
            default: nanoid(),
            when: (values) => {
               return !values.password && !Options.password;
            },
         },
         {
            name: "email",
            type: "input",
            message: "Enter the Tenant Administrator email:",
            default: "neo@thematrix.com",
            when: (values) => {
               return !values.email && !Options.email;
            },
         },
         {
            name: "url",
            type: "input",
            message: "Enter the Tenant Administrator URL:",
            default: "https://[tenantKey].site.url",
            when: (values) => {
               return !values.url && !Options.url;
            },
         },
      ])
      .then((answers) => {
         for (var a in answers) {
            Options[a] = answers[a];
         }
         Options.salt = utils.cryptoHash();
         utils
            .cryptoPassword(Options.password, Options.salt)
            .then((hPassword) => {
               Options.hashedPassword = hPassword;
               done();
            })
            .catch(done);
      })
      .catch(done);
}

/**
 * @function createUpdateCommand
 * create the UPDATE command for the Tenant Admin
 * @param {cb(err)} done
 */
function createUpdateCommand(done) {
   const pathTemplate = path.join(utils.fileTemplatePath(), "_cmd_tenant.sql");
   Options.uuid = utils.uuid();
   const contents = utils.fileRender(pathTemplate, Options);
   fs.writeFileSync("cmd_tenant.sql", contents);
   done();
}

/**
 * @function updateCommand
 * run the UPDATE command inside the container:
 * @param {cb(err)} done
 */
function updateCommand(done) {
   // figure out the running container ID
   const cmd = `docker ps | grep ${Options.stack}_db | awk '{ print $1 }'`;
   const containerID = shell.exec(cmd).stdout.replace("\n", "");

   // run the command
   let cmd2 = `docker exec -i ${containerID} mysql -uroot -p${Options.dbPassword} "appbuilder-admin" < cmd_tenant.sql`;
   // console.log(`command2[${cmd2}]`);
   let output = shell.exec(cmd2).stdout;
   console.log(output);
   done();
}

/**
 * @function removeTempFiles
 * remove any of the temp files created for the update
 * @param {cb(err)} done
 */
function removeTempFiles(done) {
   shell.rm("cmd_tenant.sql");
   done();
}

/**
 * @function writeEnvironment()
 * Write to .env used in cypress. Will get overwritten if using
 * the test stack, but most of our ci runs on the main stack
 */
function writeEnvironment(done) {
   let patches = [
      {
         file: path.join(process.cwd(), ".env"),
         tag: /Cypress Settings.*\n.*##/,
         replace: `Cypress Settings
##
CYPRESS_TENANT="admin"
CYPRESS_USER_EMAIL="${Options.email}"
CYPRESS_USER_PASSWORD="${Options.password}"
`,
      },
   ];
   utils.filePatch(patches, (err) => {
      done(err);
   });
}

/**
 * @function updateSQLInsert
 * update the TenantManager.sql data with the tenant admin user
 * @param {cb(err)} done
 */
// function updateSQLInsert(done) {
//    var adminUUID = utils.uuid();
//    var patches = [
//       {
//          file: path.join(
//             process.cwd(),
//             "mysql",
//             "init",
//             "02-tenant_manager.sql"
//          ),
//          tag: /##admin-url##/g, // <-- Global
//          replace: Options.url,
//          log: "patching: 02-tenant_manager.sql connect URL to Tenant(Admin)",
//       },
//       {
//          file: path.join(process.cwd(), "mysql", "init", "03-site_tables.sql"),
//          tag: "# Insert site_user Data #",
//          template: "_03-siteUser.sql",
//          data: {
//             uuid: adminUUID,
//             username: Options.username,
//             password: Options.hashedPassword,
//             salt: Options.salt,
//             email: Options.email,
//          },
//          log: "patching: 03-site_tables.sql with Tenant Admin Settings",
//       },
//       {
//          file: path.join(process.cwd(), "mysql", "init", "03-site_tables.sql"),
//          tag: /##admin-username##/g, // <-- Global
//          replace: Options.username,
//          log: "patching: 03-site_tables.sql connect Role(System Admin) to User(Admin)",
//       },
//    ];
//    utils.filePatch(patches, (err) => {
//       done(err);
//    });
// }

/**
 * @function updateTestConfig
 * update the test/setup/config.js with the Tenant Admin Login info
 * @param {cb(err)} done
 */
// function updateTestConfig(done) {
//    var patches = [
//       {
//          file: path.join(process.cwd(), "test", "setup", "config.js"),
//          tag: "[email]",
//          replace: Options.email,
//          log: "patching: ./test/setup/config.js with Tenant Admin Settings (email)",
//       },
//       {
//          file: path.join(process.cwd(), "test", "setup", "config.js"),
//          tag: "[password]",
//          replace: Options.password,
//          log: "patching: ./test/setup/config.js with Tenant Admin Settings (email)",
//       },
//    ];

//    utils.filePatch(patches, (err) => {
//       done(err);
//    });
// }

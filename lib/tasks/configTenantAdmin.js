//
// configTenantAdmin
// setup the initial Tenant Admin user
//
// options:
//
//
const async = require("async");
const inquirer = require("inquirer");
const { nanoid } = require("nanoid");
const path = require("path");
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
            updateSQLInsert,
            updateTestConfig,
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
            default: `http://localhost:80`,
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
 * @function updateSQLInsert
 * update the TenantManager.sql data with the tenant admin user
 * @param {cb(err)} done
 */
function updateSQLInsert(done) {
   var adminUUID = utils.uuid();
   var patches = [
      {
         file: path.join(
            process.cwd(),
            "mysql",
            "init",
            "02-tenant_manager.sql"
         ),
         tag: /##admin-url##/g, // <-- Global
         replace: Options.url,
         log: "patching: 02-tenant_manager.sql connect URL to Tenant(Admin)",
      },
      {
         file: path.join(process.cwd(), "mysql", "init", "03-site_tables.sql"),
         tag: "# Insert site_user Data #",
         template: "_03-siteUser.sql",
         data: {
            uuid: adminUUID,
            username: Options.username,
            password: Options.hashedPassword,
            salt: Options.salt,
            email: Options.email,
         },
         log: "patching: 03-site_tables.sql with Tenant Admin Settings",
      },
      {
         file: path.join(process.cwd(), "mysql", "init", "03-site_tables.sql"),
         tag: /##admin-username##/g, // <-- Global
         replace: Options.username,
         log: "patching: 03-site_tables.sql connect Role(System Admin) to User(Admin)",
      },
   ];

   utils.filePatch(patches, (err) => {
      done(err);
   });
}

/**
 * @function updateTestConfig
 * update the test/setup/config.js with the Tenant Admin Login info
 * @param {cb(err)} done
 */
function updateTestConfig(done) {
   var patches = [
      {
         file: path.join(process.cwd(), "test", "setup", "config.js"),
         tag: "[email]",
         replace: Options.email,
         log: "patching: ./test/setup/config.js with Tenant Admin Settings (email)",
      },
      {
         file: path.join(process.cwd(), "test", "setup", "config.js"),
         tag: "[password]",
         replace: Options.password,
         log: "patching: ./test/setup/config.js with Tenant Admin Settings (email)",
      },
   ];

   utils.filePatch(patches, (err) => {
      done(err);
   });
}

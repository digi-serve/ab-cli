//
// configTenantAdmin
// setup the initial Tenant Admin user
//
// options:
//
//
var async = require("async");
var inquirer = require("inquirer");
var nanoid = require("nanoid");
var path = require("path");
var utils = require(path.join(__dirname, "..", "utils", "utils"));

var Options = {}; // the running options for this command.

//
// Build the Install Command
//
var Command = new utils.Resource({
   command: "configTenantAdmin",
   params: "",
   descriptionShort: "setup the initial Tenant Admin user.",
   descriptionLong: `
`
});

module.exports = Command;

Command.help = function() {
   console.log(`

  usage: $ appbuilder configTenantAdmin

`);
};

Command.run = function(options) {
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
            updateSQLInsert
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
            }
         },
         {
            name: "password",
            type: "input",
            message: "Enter the Tenant Administrator password:",
            default: nanoid(),
            when: (values) => {
               return !values.password && !Options.password;
            }
         },
         {
            name: "email",
            type: "input",
            message: "Enter the Tenant Administrator email:",
            default: "neo@thematrix.com",
            when: (values) => {
               return !values.email && !Options.email;
            }
         }
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
   var patches = [
      {
         file: path.join(
            process.cwd(),
            "mysql",
            "init",
            "02-tenant_manager.sql"
         ),
         tag: "# Insert site_user Data #",
         template: "_02-tenant_manager.sql",
         data: {
            uuid: nanoid(),
            username: Options.username,
            password: Options.hashedPassword,
            salt: Options.salt,
            email: Options.email
         },
         log: "patching: 02-tenant_manager.sql with Tenant Admin Settings"
      }
   ];

   utils.filePatch(patches, (err) => {
      done(err);
   });
}

//
// tenantAdd
// Add a Tenant to our system.
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
   command: "tenantAdd",
   params: "",
   descriptionShort: "add a tenant to our system.",
   descriptionLong: `
`,
});

module.exports = Command;

Command.help = function () {
   console.log(`

  usage: $ appbuilder tenant add

  Add a new Tenant to our system.

  Options:

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

               // Options.stack = options._.shift();
               // if (!Options.stack) {
               //    console.log("missing required param: [stack]");
               //    Command.help();
               //    process.exit(1);
               // }
               // Options.stack = `test_${Options.stack}`;
               done();
            },
            checkDependencies,
            questions,
            userLogin,
            triggerAPI,
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
 * @function checkDependencies
 * verify the system has any required dependencies for generating ssl certs.
 * @param {function} done  node style callback(err)
 */
function checkDependencies(done) {
   utils.checkDependencies([], done);
}

/**
 * @function questions
 * Present the user with a list of configuration questions.
 * If the answer for a question is already present in Options, then we
 * skip that question.
 * @param {cb(err)} done
 */
function questions(done) {
   inquirer
      .prompt([
         {
            name: "key",
            type: "input",
            message: "Tenant Key :",
            default: "",
            validate: (input) => {
               return input != "" && input.indexOf(" ") == -1
                  ? true
                  : "Keep it user understandable and no spaces.";
            },
            when: (values) => {
               return !values.key && typeof Options.key == "undefined";
            },
         },
         {
            name: "title",
            type: "input",
            message: "Enter Tenant Name :",
            default: "",
            validate: (input) => {
               return input != "" ? true : "Enter something here.";
            },
            when: (values) => {
               return !values.title && typeof Options.title == "undefined";
            },
         },
         {
            name: "authType",
            type: "list",
            message: "What kind of authentication method:",
            choices: [
               {
                  name: "Login",
                  value: "login",
                  short: "login",
               },
               // {
               //    name: "Passwordless",
               //    value: "passwordless",
               //    short: "passwordless",
               // },
               // {
               //    name: "Use existing SSL cert",
               //    value: "exist",
               //    short: "use existing",
               // },
            ],
            when: (values) => {
               return (
                  !values.authType && typeof Options.authType == "undefined"
               );
            },
         },
         {
            name: "url",
            type: "input",
            message: "Enter Tenant URL :",
            default: "",
            when: (values) => {
               return !values.url && !Options.url;
            },
         },
         // {
         //    name: "serviceKey",
         //    type: "input",
         //    message:
         //       'Enter the service bus key ("[subject].[action]" like notification.email) :',
         //    default: "",
         //    validate: (input) => {
         //       return input != "" && input.indexOf(".") > -1
         //          ? true
         //          : "enter a key in format: [subject].[action]";
         //    },
         //    when: (values) => {
         //       return (
         //          !values.serviceKey && typeof Options.serviceKey == "undefined"
         //       );
         //    }
         // },
         // {
         //    name: "serviceSharedFiles",
         //    type: "confirm",
         //    message: "Does this service need access to shared files? :",
         //    default: false,

         //    when: (values) => {
         //       return (
         //          !values.serviceSharedFiles &&
         //          typeof Options.serviceSharedFiles == "undefined"
         //       );
         //    },
         // },
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
            name: "port",
            type: "input",
            message: "Enter the port your API stack is listening on:",
            default: 8080,
            when: (values) => {
               return !values.port && !Options.port;
            },
         },
         {
            name: "loginTenant",
            type: "input",
            message: "Enter the LoginTenant key:",
            default: "admin",
            when: (values) => {
               return !values.loginTenant && !Options.loginTenant;
            },
         },
         {
            name: "loginEmail",
            type: "input",
            message: "Enter the LoginUserEmail:",
            default: "neo@thematrix.net",
            when: (values) => {
               return !values.loginEmail && !Options.loginEmail;
            },
         },
         {
            name: "loginPassword",
            type: "input",
            message: "Enter the LoginPassword:",
            default: "",
            when: (values) => {
               return !values.loginPassword && !Options.loginPassword;
            },
         },
      ])
      .then((answers) => {
         for (var a in answers) {
            Options[a] = answers[a];
         }
         console.log("Options:", Options);
         done();
         // Options.salt = utils.cryptoHash();
         // utils
         //    .cryptoPassword(Options.password, Options.salt)
         //    .then((hPassword) => {
         //       Options.hashedPassword = hPassword;
         //       console.log("Options:", Options);
         //       done();
         //    })
         //    .catch(done);
      })
      .catch(done);
}

/**
 * @function userLogin
 * login the current user
 * @param {function} done  node style callback(err)
 */
function userLogin(done) {
   utils
      .httpPost(
         `http://localhost:${Options.port}/auth/login`,
         {
            tenant: Options.loginTenant,
            email: Options.loginEmail,
            password: Options.loginPassword,
         },
         { withCredentials: true }
      )
      .then((res) => {
         console.log(res);
         if (res.headers["set-cookie"]) {
            // Save our Session Cookie:
            Options.cookie = res.headers["set-cookie"][0].split(";").shift();
         }
         done();
      })
      .catch((error) => {
         console.error(error);

         if (
            error.response.data &&
            error.response.data.code == "EINVALIDLOGIN"
         ) {
            // reask the Questions:
            delete Options.loginTenant;
            delete Options.loginEmail;
            delete Options.loginPassword;

            questions(() => {
               // Try again
               userLogin(done);
            });
            return;
         }

         // another error.  Just Quit here.
         process.exit(1);
      });
}

/**
 * @function triggerAPI
 * Trigger the /tenant/add api
 * @param {function} done  node style callback(err)
 */
function triggerAPI(done) {
   var opts = { withCredentials: true };
   // Add our Session Cookie back in:
   if (Options.cookie) {
      opts.headers = {
         Cookie: Options.cookie,
      };
   }

   var data = {};
   ["key", "title", "authType", "username", "password", "email", "url"].forEach(
      (k) => {
         data[k] = Options[k];
      }
   );

   utils
      .httpPost(`http://localhost:${Options.port}/tenant/add`, data, opts)
      .then(() => {
         done();
      })
      .catch(done);
}

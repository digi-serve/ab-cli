//
// configNotificationEmail
// setup the local configuration for the notification_email service.
//
// options:
//
//
var async = require("async");
var inquirer = require("inquirer");
var path = require("path");
var utils = require(path.join(__dirname, "utils", "utils"));

var Options = {}; // the running options for this command.

var Config = {};

//
// Build the Install Command
//
var Command = new utils.Resource({
  command: "configNotificationEmail",
  params: "",
  descriptionShort:
    "setup the local configuration for the notification_email service.",
  descriptionLong: `
`
});

module.exports = Command;

Command.help = function() {
  console.log(`

  usage: $ appbuilder configNotificationEmail

`);
};

Command.run = function(options) {
  return new Promise((resolve, reject) => {
    async.series(
      [
        // copy our passed in options to our Options
        done => {
          for (var o in options) {
            Options[o] = options[o];
          }

          done();
        },
        checkDependencies,
        pullExistingConfigSettings,
        questions,
        buildConfig,
        saveConfig
      ],
      err => {
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
 * @function pullExistingConfigSettings
 * get the current settings from config/local.js
 * @param {cb(err)} done
 */
function pullExistingConfigSettings(done) {
  try {
    Config = require(path.join(process.cwd(), "config", "local.js"))
      .notification_email;
  } catch (e) {
    Config = {};
  }

  // make sure our primary configuration sections are defined.
  Config.enabled = Config.enabled || false;
  Config.default = Config.default || "smtp";
  Config.smtp = Config.smtp || { host: "...", port: 25, secure: false };

  done();
}

/**
 * @function questions
 * Present the user with a list of configuration questions.
 * If the answer for a question is already present in Options, then we
 * skip that question.
 * @param {cb(err)} done
 */
function questions(done) {
  var Answers = {};

  async.series(
    [
      next => {
        inquirer
          .prompt([
            {
              name: "smtpEnabled",
              type: "confirm",
              message: "Do you want to enable SMTP Email Notifications? :",
              default: Config.enabled || false,
              when: values => {
                return (
                  !values.smtpEnabled &&
                  typeof Options.smtpEnabled == "undefined"
                );
              }
            },
            {
              name: "smtpHost",
              type: "input",
              message: "Enter the SMTP Host Address (DNS entry or IP Address):",
              default: Config.smtp.host ? Config.smtp.host : "...",
              validate: input => {
                return !input || input != "..."
                  ? true
                  : "enter a valid address";
              },
              when: values => {
                return (
                  values.smtpEnabled && !values.smtpHost && !Options.smtpHost
                );
              }
            },
            {
              name: "smtpTLS",
              type: "list",
              choices: [
                {
                  // secure: false, ignoreTLS: true
                  name: "Do not use TLS.",
                  value: "noTLS",
                  short: "no TLS"
                },
                {
                  // secure: false
                  name: "Use if server supports it (STARTTLS extension)",
                  value: "serverSupport",
                  short: "server support"
                },
                {
                  // secure: true, requireTLS:true
                  name: "Require TLS",
                  value: "requireTLS",
                  short: "required"
                }
              ],
              message: "TLS Options:",
              default: Config.smtp.secure
                ? "requireTLS"
                : Config.smtp.ignoreTLS
                ? "noTLS"
                : "serverSupport",
              when: values => {
                return (
                  values.smtpEnabled && !values.smtpTLS && !Options.smtpTLS
                );
              }
            }
          ])
          .then(answers => {
            Answers = answers;

            // resolve TLS options:
            switch (Answers.smtpTLS) {
              case "noTLS":
                Answers.smtpSecure = false;
                Answers.ignoreTLS = true;
                break;

              case "serverSupport":
                Answers.smtpSecure = false;
                break;

              case "requireTLS":
                Answers.smtpSecure = true;
                Answers.requireTLS = true;
                break;
            }
            next();
          })
          .catch(next);
      },

      next => {
        var defaultPort = 25;
        if (Answers.smtpSecure) {
          defaultPort = 465;
        }
        if (!Answers.smtpEnabled) {
          next();
          return;
        }

        inquirer
          .prompt([
            {
              name: "smtpPort",
              type: "input",
              message: "Enter the SMTP port:",
              default: Config.smtp.port ? Config.smtp.port : defaultPort,
              when: values => {
                return !values.smtpPort && !Options.smtpPort;
              }
            },
            {
              name: "smtpAuth",
              type: "list",
              choices: [
                {
                  name: "Plain Text",
                  value: "plain",
                  short: "plain"
                },
                {
                  name: "Login",
                  value: "login",
                  short: "login"
                },
                {
                  name: "OAuth2",
                  value: "oauth2",
                  short: "oauth2"
                }
              ],
              message: "What type of authentication:",
              default: Config.smtp.auth
                ? Config.smtp.auth.type
                  ? Config.smtp.auth.type
                  : "login"
                : "plain",
              when: values => {
                return !values.smtpAuth && !Options.smtpAuth;
              }
            },
            {
              name: "smtpAuthUser",
              type: "input",
              message: "SMTP Auth User:",
              default:
                !Config.smtp.auth || !Config.smtp.auth.user
                  ? "user name"
                  : Config.smtp.auth.user,
              validate: input => {
                return input != "user name" ? true : "enter a valid user name";
              },
              when: values => {
                return values.smtpAuth == "login" && !Options.smtpAuthUser;
              }
            },
            {
              name: "smtpAuthPass",
              type: "password",
              message: "SMTP Auth Password:",
              mask: "*",
              default:
                !Config.smtp.auth || !Config.smtp.auth.pass
                  ? "password"
                  : Config.smtp.auth.pass,
              validate: input => {
                return input != "" && input != "password"
                  ? true
                  : "enter a valid password (cannot be empty)";
              },
              when: values => {
                return values.smtpAuth == "login" && !Options.smtpAuthPass;
              }
            }
          ])
          .then(answers => {
            for (var a in answers) {
              Answers[a] = answers[a];
            }
            next();
          })
          .catch(next);
      }
    ],
    err => {
      for (var a in Answers) {
        Options[a] = Answers[a];
      }
      console.log("Options:", Options);
      done(err);
    }
  );
}

/**
 * @function buildConfig
 * create the config settings from the given options.
 * @param {cb(err)} done
 */
function buildConfig(done) {
  Config = {
    enabled: Options.smtpEnabled,
    default: Config.default,
    smtp: {
      host: Options.smtpHost,
      port: Options.smtpPort,
      secure: Options.smtpSecure
    }
  };

  if (Options.ignoreTLS) {
    Config.smtp.ignoreTLS = true;
  }

  if (Options.requireTLS) {
    Config.smtp.requireTLS = true;
  }

  switch (Options.smtpAuth) {
    case "plain":
      // we don't need to fill out the .auth field
      break;

    case "login":
      Config.smtp.auth = {
        user: Options.smtpAuthUser,
        pass: Options.smtpAuthPass
      };
      break;

    case "oauth2":
      console.log("TODO: fill out oauth2 parameters");
      break;
  }

  done();
}

/**
 * @function saveConfig
 * store our new configuration settings in our bot_manager:{} settings.
 * @param {cb(err)} done
 */
function saveConfig(done) {
  var jsonConfig = JSON.stringify(Config, null, 2);

  // indent the new data
  jsonConfig = utils.stringReplaceAll(jsonConfig, "\n", "\n  ");

  // wrap in bot_manager: {}
  jsonConfig = `notification_email: ${jsonConfig},
  /* end notification_email */`;

  utils.filePatch(
    [
      // patch our config/local.js
      {
        file: path.join(process.cwd(), "config", "local.js"),
        // tag: /bot_manager:\s*{[\w\d\s\S]*?},\s*\/\*\*/,
        tag: /notification_email:\s*{[\w\d\s\S]*?},*\s*\/\*\s*end\s*notification_email\s*\*\//,
        replace: jsonConfig,
        log: ""
      }
    ],
    done
  );
}

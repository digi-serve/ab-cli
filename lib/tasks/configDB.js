//
// configDB
// setup the local configuration of the DB
//
// options:
//
//
var async = require("async");
var fs = require("fs");
var inquirer = require("inquirer");
var nanoid = require("nanoid");
var path = require("path");
var utils = require(path.join(__dirname, "..", "utils", "utils"));

var Options = {}; // the running options for this command.

var Config = {};

//
// Build the Install Command
//
var Command = new utils.Resource({
  command: "configDB",
  params: "",
  descriptionShort: "setup the local configuration of the Database.",
  descriptionLong: `
`
});

module.exports = Command;

Command.help = function() {
  console.log(`

  usage: $ appbuilder configBotManager

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
        saveConfig,
        saveRootPassword,
        setupWin32Env
        // TODO: configure the File System encryption.
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
    Config = require(path.join(process.cwd(), "config", "local.js")).datastores;
  } catch (e) {
    Config = {};
  }

  Config.appbuilder = Config.appbuilder || {};
  Config.site = Config.site || {};

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
  // var platform = process.platform;

  inquirer
    .prompt([
      {
        name: "password",
        type: "input",
        message: "Enter the password for the DB Root User?",
        default: Config.appbuilder.password || nanoid(),
        when: values => {
          return !values.password && !Options.password;
        }
      }
    ])
    .then(answers => {
      for (var a in answers) {
        Options[a] = answers[a];
      }
      // console.log("Options:", Options);
      done();
    })
    .catch(done);
}

/**
 * @function buildConfig
 * create the config settings from the given options.
 * @param {cb(err)} done
 */
function buildConfig(done) {
  Config = {
    appbuilder: {
      adapter: "sails-mysql",
      host: "db",
      port: 3306,
      user: "root",
      password: Options.password,
      database: "appbuilder"
    },
    site: {
      adapter: "sails-mysql",
      host: "db",
      port: 3306,
      user: "root",
      password: Options.password,
      database: "site"
    }
  };

  done();
}

/**
 * @function saveConfig
 * store our new configuration settings in our datastores:{} settings.
 * @param {cb(err)} done
 */
function saveConfig(done) {
  var jsonConfig = JSON.stringify(Config, null, 2);

  // indent the new data
  jsonConfig = utils.stringReplaceAll(jsonConfig, "\n", "\n  ");

  // wrap in datastores: {}
  jsonConfig = `datastores: ${jsonConfig},
  /* end datastores */`;

  utils.filePatch(
    [
      // patch our config/local.js
      {
        file: path.join(process.cwd(), "config", "local.js"),
        // tag: /bot_manager:\s*{[\w\d\s\S]*?},\s*\/\*\*/,
        tag: /datastores:\s*{[\w\d\s\S]*?},*\s*\/\*\s*end\s*datastores\s*\*\//,
        replace: jsonConfig,
        log: ""
      }
    ],
    done
  );
}

/**
 * @function saveRootPassword
 * store our password in the ./mysql/password file.
 * @param {cb(err)} done
 */
function saveRootPassword(done) {
  fs.writeFileSync(
    path.join(process.cwd(), "mysql", "password"),
    Options.password
  );
  done();
}

/**
 * @function setupWin32Env
 * make configuration changes for win32 environments
 * @param {cb(err)} done
 */
function setupWin32Env(done) {
  if (process.platform != "win32") {
    done();
    return;
  }

  // on win32, patch the DB commands.
  utils.filePatch(
    [
      // patch our docker-compose.dev.yml
      {
        file: path.join(process.cwd(), "docker-compose.dev.yml"),
        // tag: /bot_manager:\s*{[\w\d\s\S]*?},\s*\/\*\*/,
        tag: /#\s*command:\s*mysqld/,
        replace: "command: mysqld",
        log: ""
      },
      // patch our docker-compose.yml
      {
        file: path.join(process.cwd(), "docker-compose.yml"),
        // tag: /bot_manager:\s*{[\w\d\s\S]*?},\s*\/\*\*/,
        tag: /#\s*command:\s*mysqld/,
        replace: "command: mysqld",
        log: ""
      }
    ],
    done
  );
}

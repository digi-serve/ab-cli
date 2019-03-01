//
// configBotManager
// setup the local configuration for the Bot Manager
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

var Config = {};

//
// Build the Install Command
//
var Command = new utils.Resource({
  command: "configBotManager",
  params: "",
  descriptionShort: "setup the local configuration of the Bot Manager.",
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
      .bot_manager;
  } catch (e) {
    Config = {};
  }

  // make sure our primary configuration sections are defined.
  Config.dockerHub = Config.dockerHub || {};
  Config.slackBot = Config.slackBot || {};
  Config.hostConnection = Config.hostConnection || {};

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
  var platform = process.platform;

  inquirer
    .prompt([
      // {
      //   name: "dhEnable",
      //   type: "confirm",
      //   message: "Do you want to enable DockerHub webhooks? :",
      //   default: false,
      //   when: values => {
      //     return !values.dhEnable && typeof Options.dhEnable == "undefined";
      //   }
      // },
      // {
      //   name: "dhPort",
      //   type: "input",
      //   message: "What Port do you want to listen on for DockerHub webhooks :",
      //   default: 14000,
      //   when: values => {
      //     return !values.dhPort && !Options.dhPort;
      //   }
      // },
      {
        name: "botEnable",
        type: "confirm",
        message: "Do you want to connect to a #Slack channel for updates?",
        default: Config.slackBot.enable ? true : false,
        when: values => {
          return !values.botEnable && !Options.botEnable;
        }
      },
      {
        name: "botToken",
        type: "input",
        message: "Enter the slackbot token to use:",
        default: Config.slackBot.botToken ? Config.slackBot.botToken : "...",
        validate: input => {
          return !input || input != "..." ? true : "enter a token";
          // TODO: check if it is in proper slackbot token format
        },
        when: values => {
          return values.botEnable && !values.botToken && !Options.botToken;
        }
      },
      {
        name: "botName",
        type: "input",
        message: "Enter the slackbot name to display:",
        default: Config.slackBot.botName ? Config.slackBot.botName : "T1000",
        when: values => {
          return values.botEnable && !values.botName && !Options.botName;
        }
      },
      {
        name: "slackChannel",
        type: "input",
        message: "Enter the #Slack channel to interact with (without the '#'):",
        default: Config.slackBot.channel ? Config.slackBot.channel : "general",
        when: values => {
          return (
            values.botEnable && !values.slackChannel && !Options.slackChannel
          );
        }
      },
      {
        name: "hosttcpport",
        type: "input",
        message: "What port do you want to listen for commands on:",
        default:
          Config.hostConnection.tcp && Config.hostConnection.tcp.port
            ? Config.hostConnection.tcp.port
            : 1338,
        when: () => {
          return platform == "darwin";
        }
      }
    ])
    .then(answers => {
      for (var a in answers) {
        Options[a] = answers[a];
      }
      console.log("Options:", Options);
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
  Config.dockerHub = {
    enable: Options.dhEnable,
    port: Options.dhPort
  };

  Config.slackBot = {
    enable: Options.botEnable,
    botToken: Options.botToken,
    botName: Options.botName,
    channel: Options.slackChannel
  };

  Config.triggers = Config.triggers || [];
  if (Config.triggers.length == 0) {
    // insert a new trigger entry, that we will patch later:
    Config.triggers.push({ new: "trigger" });
  }

  if (process.platform == "darwin") {
    Config.hostConnection = {
      tcp: {
        port: Options.hosttcpport,
        accessToken: nanoid()
      }
    };
  } else {
    Config.hostConnection = {
      sharedSock: {
        path: "/tmp/appbuilder.sock"
      }
    };
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
  jsonConfig = `bot_manager: ${jsonConfig},
  /* end bot_manager */`;

  var newTriggers = `"triggers": [
      { search: /skipdaddy\\/.*:${Options.dockerTag ||
        "master"}/, command: "update", options: {} }
    ]`;

  utils.filePatch(
    [
      // patch our config/local.js
      {
        file: path.join(process.cwd(), "config", "local.js"),
        // tag: /bot_manager:\s*{[\w\d\s\S]*?},\s*\/\*\*/,
        tag: /bot_manager:\s*{[\w\d\s\S]*?},*\s*\/\*\s*end\s*bot_manager\s*\*\//,
        replace: jsonConfig,
        log: ""
      },
      // patch the triggers definition:
      {
        file: path.join(process.cwd(), "config", "local.js"),
        tag: /"*triggers"*:\s*\[\s*{\s*"*new"*\s*:\s*"trigger"\s*}\s*\]/,
        replace: newTriggers,
        log: ""
      }
    ],
    done
  );
}

//
// setup
// create the local config options for the AppBuilder runtime.
//
// options:
//  --port : the port to listen on for the local system
//  --tag  : the docker tag of the images to run
//
var async = require("async");
var fs = require("fs");
var inquirer = require("inquirer");
var path = require("path");
var utils = require(path.join(__dirname, "utils", "utils"));

var Options = {}; // the running options for this command.

const GeneratedFiles = {
  // source file :  generated file
  "source.docker-compose.yml": "docker-compose.yml",
  "source.docker-compose.dev.yml": "docker-compose.dev.yml"
};
//
// Build the SSL Command
//
var Command = new utils.Resource({
  command: "setup",
  params: "--port [port#] --tag [dockerTag]",
  descriptionShort: "setup the running configuration for an AppBuilder config.",
  descriptionLong: `
`
});

module.exports = Command;

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
        questions,
        removeGeneratedFiles,
        generateFiles,
        copyTemplateFiles,
        setupSSL,
        setupBotManager,
        setupNotificationEmail
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
        name: "port",
        type: "input",
        message: "What port do you want AppBuilder to listen on (80):",
        default: 80,
        when: values => {
          return !values.port && !Options.port;
        }
      },
      {
        name: "tag",
        type: "input",
        message: "Which Docker Tags to use [master, develop]:",
        default: "master",
        filter: input => {
          if (input == "") {
            return "master";
          } else {
            return input;
          }
        },
        validate: input => {
          return !input ||
            ["master", "develop"].indexOf(input.toLowerCase()) != -1
            ? true
            : `"master" or "develop"`;
        },
        when: values => {
          return !values.tag && !Options.tag;
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
 * @function removeGeneratedFiles
 * Remove any generated files
 * @param {cb(err)} done
 */
function removeGeneratedFiles(done) {
  var generatedFiles = Object.keys(GeneratedFiles).map(k => {
    return GeneratedFiles[k];
  });
  var cwd = process.cwd();
  async.each(
    generatedFiles,
    (file, cb) => {
      var pathFile = path.join(cwd, file);
      fs.unlink(pathFile, err => {
        if (err) {
          // console.log(err);
        }
        cb();
      });
    },
    err => {
      done(err);
    }
  );
}

/**
 * @function generateFiles
 * generate files
 * @param {cb(err)} done
 */
function generateFiles(done) {
  var sourceFiles = Object.keys(GeneratedFiles);
  var cwd = process.cwd();
  async.each(
    sourceFiles,
    (file, cb) => {
      // render the source files
      var pathSourceFile = path.join(cwd, file);
      var contents = utils.fileRender(pathSourceFile, Options);

      // write them to the destination files
      var pathFile = path.join(cwd, GeneratedFiles[file]);
      fs.writeFile(pathFile, contents, err => {
        if (err) {
          console.log(err);
        }
        cb(err);
      });
    },
    err => {
      done(err);
    }
  );
}

/**
 * @function copyTemplateFiles
 * copy our template files into the project
 * @param {cb(err)} done
 */
function copyTemplateFiles(done) {
  utils.fileCopyTemplates("setup", {}, [], done);
}

/**
 * @function setupSSL
 * run the ssl setup command.
 * @param {cb(err)} done
 */
function setupSSL(done) {
  var sslCommand = require(path.join(__dirname, "ssl.js"));

  // scan Options for ssl related options:
  // "ssl.self"
  // "ssl.pathKey ssl.pathCert"
  // "ssl.none"
  var sslOptions = {};
  for (var o in Options) {
    var parts = o.split(".");
    if (parts[0] == "ssl") {
      sslOptions[parts[1]] = Options[o];
    }
  }

  sslCommand
    .run(sslOptions)
    .then(done)
    .catch(done);
}

/**
 * @function setupBotManager
 * run the configBotManager setup command.
 * @param {cb(err)} done
 */
function setupBotManager(done) {
  var botManagerCommand = require(path.join(
    __dirname,
    "tasks",
    "configBotManager.js"
  ));

  // scan Options for ssl related options:
  // "bot.dhEnabled, bot.dhPort"
  // "bot.botEnable, bot.botToken, bot.botName, bot.slackChannel"
  var botOptions = {
    dhEnable: false,
    dhPort: 14000,
    dockerTag: Options.tag
  };

  for (var o in Options) {
    var parts = o.split(".");
    if (parts[0] == "bot") {
      botOptions[parts[1]] = Options[o];
    }
  }

  botManagerCommand
    .run(botOptions)
    .then(done)
    .catch(done);
}

/**
 * @function setupNotificationEmail
 * run the configNotificationEmail setup command.
 * @param {cb(err)} done
 */
function setupNotificationEmail(done) {
  var notificationEmailCommand = require(path.join(
    __dirname,
    "tasks",
    "configNotificationEmail.js"
  ));

  // scan Options for ssl related options:
  // smtp.smtpEnabled
  // smtp.smtpHost,
  // smtp.smtpTLS
  // smtp.smtpPort
  // smtp.smtpAuth, smtp.smtpAuthUser, smtp.smtpAuthPass
  var emailOptions = {};

  for (var o in Options) {
    var parts = o.split(".");
    if (parts[0] == "smtp") {
      emailOptions[parts[1]] = Options[o];
    }
  }

  notificationEmailCommand
    .run(emailOptions)
    .then(done)
    .catch(done);
}

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
var shelljs = require("shelljs");
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
`,
});

module.exports = Command;

Command.help = function () {
   console.log(`

  usage: $ appbuilder configDB

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
            checkDependencies,
            pullExistingConfigSettings,
            questions,
            buildConfig,
            saveConfig,
            preventExpose,
            saveRootPassword,
            setupWin32Env,
            setProperDBconfig,
            setupFileEncryptionKeys,
            patchTestingFiles,
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
   Options.canEncrypt = true; // optimistic
   if (!shelljs.which("openssl")) {
      Options.canEncrypt = false;
      Options.encryption = false;
      console.log(`

  NOTE: to encrypt the DB tables, you need to install openssl
        and run this command again.

`);
   }

   // utils.checkDependencies([""], done);
   done();
}

/**
 * @function pullExistingConfigSettings
 * get the current settings from config/local.js
 * @param {cb(err)} done
 */
function pullExistingConfigSettings(done) {
   try {
      Config = require(path.join(process.cwd(), "config", "local.js"))
         .datastores;
   } catch (e) {
      Config = {};
   }

   // it is possible there are not any .datastores defined:
   if (typeof Config === "undefined") {
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
            when: (values) => {
               return !values.password && !Options.password;
            },
         },
         {
            name: "encryption",
            type: "confirm",
            message: "Do you want to encrypt the DB tables on disk?",
            default: false,
            when: (values) => {
               return (
                  Options.canEncrypt &&
                  typeof values.encryption == "undefined" &&
                  typeof Options.encryption == "undefined"
               );
            },
         },
         {
            name: "encryptionPword",
            type: "input",
            message: "Enter an encryption password:",
            default: nanoid(),
            when: (values) => {
               return (
                  (values.encryption || Options.encryption) &&
                  !values.encryptionPword &&
                  !Options.encryptionPword
               );
            },
         },
      ])
      .then((answers) => {
         for (var a in answers) {
            Options[a] = answers[a];
         }
         // console.log("Options:", Options);

         // we go ahead and generate encryption keys in order to make sure our
         // default values are never used in a live environment.  So go ahead
         // and set an encryptionPword here:
         if (!Options.encryptionPword) {
            Options.encryptionPword = nanoid();
         }

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
         database: "appbuilder",
      },
      site: {
         adapter: "sails-mysql",
         host: "db",
         port: 3306,
         user: "root",
         password: Options.password,
         database: Options.v1 ? "site" : "appbuilder-admin",
      },
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
            log: "",
         },
      ],
      done
   );
}

/**
 * @function preventExpose
 * remove exposing the db
 * @param {cb(err)} done
 */
function preventExpose(done) {
   if (
      typeof Options.expose == "undefined" ||
      (Options.expose != "false" && Options.expose != false)
   ) {
      done();
      return;
   }

   var nonExposeDBTag = /image:\s*mariadb\s*\n\s*ports:\s*\n\s*-/;
   var nonExposeDBReplace = `image: mariadb
    # ports:
    #   -`;

   utils.filePatch(
      [
         // patch our docker-compose.dev.yml
         {
            file: path.join(process.cwd(), "docker-compose.dev.yml"),
            // tag: /bot_manager:\s*{[\w\d\s\S]*?},\s*\/\*\*/,
            tag: nonExposeDBTag,
            replace: nonExposeDBReplace,
            log: "",
         },
         // patch our docker-compose.yml
         {
            file: path.join(process.cwd(), "docker-compose.yml"),
            // tag: /bot_manager:\s*{[\w\d\s\S]*?},\s*\/\*\*/,
            tag: nonExposeDBTag,
            replace: nonExposeDBReplace,
            log: "",
         },
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
   try {
      fs.writeFileSync(
         path.join(process.cwd(), "mysql", "password"),
         Options.password
      );
      done();
   } catch (e) {
      done(e);
   }
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

   // create a docker volume for storing the arangoData
   // shelljs.exec("docker volume create arangoData");

   // on win32, patch the DB commands.

   // comment out `command: ["mysqld", "--alter-algorithm=copy"]`
   const commentOut =  {
      tag: /command:\s*\["mysqld"/,
      replace: '# command: ["mysqld"',
   };
   utils.filePatch(
      [
         // patch our docker-compose.dev.yml
         {
            file: path.join(process.cwd(), "docker-compose.dev.yml"),
            // tag: /bot_manager:\s*{[\w\d\s\S]*?},\s*\/\*\*/,
            tag: /#\s*command:\s*mysqld/,
            replace: "command: mysqld",
            log: "",
         },
         {
            file: path.join(process.cwd(), "docker-compose.dev.yml"),
            tag: commentOut.tag,
            replace: commentOut.replace,
            log: "",
         },
         // patch our docker-compose.yml
         {
            file: path.join(process.cwd(), "docker-compose.yml"),
            // tag: /bot_manager:\s*{[\w\d\s\S]*?},\s*\/\*\*/,
            tag: /#\s*command:\s*mysqld/,
            replace: "command: mysqld",
            log: "",
         },
         {
            file: path.join(process.cwd(), "docker-compose.yml"),
            tag: commentOut.tag,
            replace: commentOut.replace,
            log: "",
         },
         // patch our dbinit-compose.yml
         {
            file: path.join(process.cwd(), "dbinit-compose.yml"),
            // tag: /bot_manager:\s*{[\w\d\s\S]*?},\s*\/\*\*/,
            tag: /#\s*command:\s*mysqld/,
            replace: "command: mysqld",
            log: "",
         },
         // replace arango data binding with volume
         {
            file: path.join(process.cwd(), "dbinit-compose.yml"),
            // tag: /bot_manager:\s*{[\w\d\s\S]*?},\s*\/\*\*/,
            tag: /-\s*type.*\s*.*data.*\s.*arangodb3/,
            replace: "- arangoData:/var/lib/arangodb3",
            log: "",
         },
         // add final volume setting
         {
            file: path.join(process.cwd(), "dbinit-compose.yml"),
            // tag: /bot_manager:\s*{[\w\d\s\S]*?},\s*\/\*\*/,
            tag: /arango\/init\s*.*/,
            replace: `arango/init
        target: /docker-entrypoint-initdb.d

volumes:
  arangoData:
    external: true`,
            log: "",
         },
      ],
      done
   );
}

/**
 * @function setProperDBconfig
 * set the proper DB config settings in the docker-compose files
 * @param {cb(err)} done
 */
function setProperDBconfig(done) {
   // Not valid for v1
   if (Options.v1) {
      done();
      return;
   }

   var config = `source: ./mysql/conf.d/my-noencrypt.cnf`;
   if (Options.encryption) {
      config = `source: ./mysql/conf.d/my.cnf`;
   }

   // make sure we are using the proper my-*.cfg file:
   utils.filePatch(
      [
         // patch our config-compose.dev.yml
         {
            file: path.join(process.cwd(), "config-compose.yml"),
            tag: /source:\s*.\/mysql\/conf\.d\/my-*\w*\.cnf/,
            replace: config,
            log: "",
         },
      ],
      done
   );
}

/**
 * @function setupFileEncryptionKeys
 * Create a new set of encryption keys for the DB file encryption.
 * The default install will have a pw of : n0spoon
 * The first time we run through this config, we want to generate new
 * keys/password from the github checkout data.
 * @param {cb(err)} done
 */
function setupFileEncryptionKeys(done) {
   // if we are not able to run openssl, then skip this step
   if (!Options.canEncrypt) {
      done();
      return;
   }

   // load the current password
   var pathFilePWord = path.join(process.cwd(), "mysql", "key", ".key");
   var currPassword = fs.readFileSync(pathFilePWord, "utf8");

   // 'n0spoon' is our default placeholder. If the value has changed,
   // then the encryption keys are probably aready setup.
   // if pw != 'n0spoon' then skip
   if (currPassword.indexOf("n0spoon") == -1) {
      done();
      return;
   }

   // generate keys:
   var key1 = shelljs.exec("openssl rand -hex 32").stdout.replace("\n", "");
   var key2 = shelljs.exec("openssl rand -hex 32").stdout.replace("\n", "");
   var key3 = shelljs.exec("openssl rand -hex 32").stdout.replace("\n", "");

   // write keys to a file:
   var contents = `1;${key1}
2;${key2}
3:${key3}`;
   var pathRawKeys = path.join(process.cwd(), "mysql", "key", "keys");
   fs.writeFileSync(pathRawKeys, contents);

   // encrypt the keys file:
   var pathEncrKeys = path.join(process.cwd(), "mysql", "key", "keys.enc");
   shelljs.exec(
      `openssl enc -aes-256-cbc -md sha1 -k ${Options.encryptionPword} -in ${pathRawKeys} -out ${pathEncrKeys}`
   );

   // remove the plain keys file:
   shelljs.rm(pathRawKeys);

   // now save the password to the .key file:
   fs.writeFileSync(pathFilePWord, Options.encryptionPword);

   done();
}

/**
 * @function patchTestingFiles
 * Pass in the proper DB.password information into our testing scripts.
 * @param {cb(err)} done
 */
function patchTestingFiles(done) {
   // Not valid for v1
   if (Options.v1) {
      done();
      return;
   }

   utils.filePatch(
      [
         // patch our config-compose.dev.yml
         {
            file: path.join(process.cwd(), "test", "setup", "reset.sh"),
            tag: /\[dbPassword\]/g, // <-- /g replaces all instances
            replace: Options.password,
            log: "",
         },
         // Windows friendly reset.sh script: remove \r
         {
            file: path.join(process.cwd(), "test", "setup", "reset.sh"),
            tag: /\r/g, // <-- /g replaces all instances
            replace: "",
            log: "",
         },
      ],
      done
   );
}

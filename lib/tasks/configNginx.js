//
// configNginx
// setup the local configuration of the Nginx
//
// options:
//
//
var async = require("async");
var inquirer = require("inquirer");
var path = require("path");
var utils = require(path.join(__dirname, "..", "utils", "utils"));

var Options = {}; // the running options for this command.

//
// Build the Install Command
//
var Command = new utils.Resource({
   command: "configNginx",
   params: "",
   descriptionShort: "setup the local configuration of the nginx server.",
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
            questions,
            insertDockerConfig,
            // setupSSL
         ],
         (err) => {
            if (err) {
               reject(err);
               return;
            }
            resolve(Options);
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
            name: "enable",
            type: "confirm",
            message: "Use nginx as a proxy server?",
            default: true,
            when: (values) => {
               return (
                  typeof values.enable == "undefined" &&
                  typeof Options.enable == "undefined"
               );
            },
         },
         {
            name: "port",
            type: "input",
            message: "What port do you want AppBuilder to listen on (80):",
            default: 80,
            when: (values) => {
               return values.enable && !values.port && !Options.port;
            },
         },
      ])
      .then((answers) => {
         for (var a in answers) {
            Options[a] = answers[a];
         }

         done();
      })
      .catch(done);
}

/**
 * @function insertDockerConfig
 * insert the nginx docker config into our docker-compose files.
 * @param {cb(err)} done
 */
function insertDockerConfig(done) {
   if (!Options.enable) {
      console.log("nginx: not using nginx as a proxy server");
      done();
      return;
   }

   // package the docker-compose.yml entry for this new service
   var configContents = utils.fileRender(
      path.join(utils.fileTemplatePath(), "_nginx.dockercompose.yml"),
      Options
   );
   var configEntry = `services:
${configContents}
`;

   var volumeEntry = `nginx_etc:
  redis_data:`;

   // The config-compose.yml needs to now mound and create our nginx
   // volume settings
   var configVolumeEntry = `mysql_password:
  nginx_etc:`;

   var configComposeBindings = `target: /mysql_password_source/password
      - type: bind
        source: ./nginx/nginx.conf
        target: /nginx/nginx.conf
      - type: bind
        source: ./nginx/default-nossl.conf
        target: /nginx/conf.d/default.conf
      - type: bind
        source: ./nginx/ssl
        target: /ssl`;

   var configVolumeMount = `mysql_password:/mysql_password
      - nginx_etc:/nginx_etc`;

   var patches = [
      {
         file: path.join(process.cwd(), "docker-compose.yml"),
         tag: "services:",
         replace: configEntry,
         log: "nginx: adding config to docker-compose.yml",
      },
      {
         file: path.join(process.cwd(), "docker-compose.dev.yml"),
         tag: "services:",
         replace: configEntry,
         log: "nginx: adding config to docker-compose.dev.yml",
      },
      {
         file: path.join(process.cwd(), "docker-compose.yml"),
         tag: "redis_data:",
         replace: volumeEntry,
         log: "nginx: adding nginx_etc to docker-compose.yml",
      },
      {
         file: path.join(process.cwd(), "docker-compose.dev.yml"),
         tag: "redis_data:",
         replace: volumeEntry,
         log: "nginx: adding nginx_etc to docker-compose.dev.yml",
      },
      {
         file: path.join(process.cwd(), "config-compose.yml"),
         tag: "mysql_password:",
         replace: configVolumeEntry,
         log: "nginx: adding nginx_etc to config-compose.yml",
      },
      {
         file: path.join(process.cwd(), "config-compose.yml"),
         tag: "target: /mysql_password_source/password",
         replace: configComposeBindings,
         log: "nginx: adding nginx bindings to config-compose.yml",
      },
      {
         file: path.join(process.cwd(), "config-compose.yml"),
         tag: "mysql_password:/mysql_password",
         replace: configVolumeMount,
         log: "nginx: adding nginx_etc mount to config-compose.yml",
      },
   ];

   utils.filePatch(patches, (err) => {
      done(err);
   });
}

/**
 * @function setupSSL
 * run the ssl setup command.
 * @param {cb(err)} done
 */
/*
function setupSSL(done) {
   var sslCommand = require(path.join(__dirname, "..", "ssl.js"));

   // scan Options for ssl related options:
   // "ssl.self"
   // "ssl.pathKey ssl.pathCert"
   // "ssl.none"
   var sslOptions = Options.ssl || {};

   // handle any arguments that are in the form of "--ssl.arg"
   for (var o in Options) {
      var parts = o.split(".");
      if (parts[0] == "ssl") {
         sslOptions[parts[1]] = Options[o];
      }
   }
   // handle arguments in the form of "[--nginx.]sslArg"
   // but the prefix prior to the dot have already been filtered and removed.
   for (var i in Options) {
      if (i == "sslType") {
         var sslType = Options[i];
         sslOptions[sslType] = true;
         sslOptions["process"] = sslType;
      } else if (i.indexOf("ssl") == 0 && i.length > 3) {
         sslOptions[i] = Options[i];
      }
   }

   sslCommand
      .run(sslOptions)
      .then(done)
      .catch(done);
}
*/

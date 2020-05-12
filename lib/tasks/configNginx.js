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
`
});

module.exports = Command;

Command.help = function() {
   console.log(`

  usage: $ appbuilder configDB

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
            insertDockerConfig,
            setupSSL
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
            name: "nginxEnable",
            type: "confirm",
            message: "Use nginx as a proxy server?",
            default: true,
            when: (values) => {
               return !values.nginxEnable && typeof(Options.nginxEnable) == "undefined"
            }
         }
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
   if (!Options.nginxEnable) {
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

   var patches = [
      {
         file: path.join(process.cwd(), "docker-compose.yml"),
         tag: "services:",
         replace: configEntry,
         log: "nginx: adding config to docker-compose.yml"
      },
      {
         file: path.join(process.cwd(), "docker-compose.dev.yml"),
         tag: "services:",
         replace: configEntry,
         log: "nginx: adding config to docker-compose.dev.yml"
      }
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
function setupSSL(done) {
   var sslCommand = require(path.join(__dirname, "..", "ssl.js"));

   // scan Options for ssl related options:
   // "ssl.self"
   // "ssl.pathKey ssl.pathCert"
   // "ssl.none"
   var sslOptions = Options.ssl || {};

   /// handle any arguments that are in the form of "--ssl.arg"
   for (var o in Options) {
      var parts = o.split(".");
      if (parts[0] == "ssl") {
         sslOptions[parts[1]] = Options[o];
      }
   }
   /// handle any arguments that are in the form of "[nginx.]sslArg"
   for (var i in Options) {
      if (i == "sslType") {
	var sslType = Options[i];
        sslOptions[sslType] = true;
        sslOptions["process"] = sslType;
      }
      else if ( i.indexOf("ssl") == 0 && i.length > 3 ) {
        sslOptions[i] = Options[i];
      }
   }
   
   sslCommand
      .run(sslOptions)
      .then(done)
      .catch(done);
}

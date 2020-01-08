//
// SSL
// generate ssl connections.
//
// options:
//  --self : generate a self signed cert
//  --pathKey : path to an existing key
//  --pathCert : pato to an existing Cert
//  --none : remove any ssl setup.
//
var async = require("async");
var chalk = require("chalk");
var fs = require("fs");
var inquirer = require("inquirer");
var path = require("path");
var shell = require("shelljs");
var utils = require(path.join(__dirname, "utils", "utils"));

var Options = {}; // the running options for this command.

//
// Build the SSL Command
//
var Command = new utils.Resource({
   command: "ssl",
   params: "--self ||  --pathKey [pathToKey] --pathCert [pathToCert] || --none",
   descriptionShort: "setup ssl encryption in AppBuilder installation.",
   descriptionLong: `
`
});

module.exports = Command;

/**
 * @function help
 * display specific help instructions for the ssl command.
 */
Command.help = function() {
   console.log(`

  usage: $ appbuilder ssl [options]

  Update the configuration files to support (or not support) SSL encryption.

  [options] :
    --self  : generate and use self signed certificates

    --pathKey [path/to/key.pem] : use an existing key
    --pathCert [path/to/cert.pem] : use an existing certificate

    --none  : no ssl encryption

  examples:

    $ appbuilder ssl --none
        - removes ssl encryption from current installation

    $ appbuilder ssl --self
        - generates self signed certificates
        - updates nginx to use those certificates
        - updates nginx to use the ssl default.conf

    $ appbuilder ssl  --pathKey /etc/ssl/key.pem  --pathCert /etc/ssl/cert.pem
        - updates nginx to use the specified certificates
        - updates nginx to use the ssl default.conf

`);
};

/**
 * @function run
 * perform the action for this command.
 * @param {obj} options
 *        provided parameters for this command
 */
Command.run = function(options) {
   return new Promise((resolve, reject) => {
      // doProcess: {array} of async fns to be processed for our command.
      var doProcess = [];

      // display help instructions if that was requested.
      if (options.help) {
         Command.help();
         process.exit();
         return;
      }

      // verify provided paths are valid:
      var checkParams = ["pathKey", "pathCert"];
      checkParams.forEach((param) => {
         if (options[param]) {
            try {
               if (!fs.statSync(options[param]).isFile()) {
                  console.log(
                     `${param} : ${chalk.yellow.bold(
                        options[param]
                     )} is not a file.
              `
                  );
                  delete options[param];
               }
            } catch (e) {
               console.log(
                  `${param} : ${chalk.yellow.bold(options[param])} is not found.
            `
               );
               delete options[param];
            }
         }
      });

      inquirer
         .prompt([
            {
               name: "process",
               type: "list",
               message: "What kind of SSL encryption do you want:",
               choices: [
                  {
                     name: "No SSL encryption",
                     value: "none",
                     short: "none"
                  },
                  {
                     name: "Create Self Signed Cert",
                     value: "self",
                     short: "create"
                  },
                  {
                     name: "Use existing SSL cert",
                     value: "exist",
                     short: "use existing"
                  }
               ],
               when: (values) => {
                  return (
                     !values.process &&
                     !options.self &&
                     !options.none &&
                     !options.exist
                  );
               }
            },
            {
               name: "sslCountryName",
               type: "input",
               message: "Country Name (2 letter code):",
               when: (values) => {
                  // only display this question if we answered 'self' to 1st prompt
                  return values.process == "self" && !options.sslCountryName;
               }
            },
            {
               name: "sslProvinceName",
               type: "input",
               message: "State or Province Name (full name):",
               when: (values) => {
                  // only display this question if we answered 'self' to 1st prompt
                  return values.process == "self" && !options.sslProvinceName;
               }
            },
            {
               name: "sslLocalityName",
               type: "input",
               message: "Locality Name (name of city):",
               when: (values) => {
                  // only display this question if we answered 'self' to 1st prompt
                  return values.process == "self" && !options.sslLocalityName;
               }
            },
            {
               name: "sslOrganizationName",
               type: "input",
               message: "Organization Name (name of company):",
               when: (values) => {
                  // only display this question if we answered 'self' to 1st prompt
                  return (
                     values.process == "self" && !options.sslOrganizationName
                  );
               }
            },
            {
               name: "sslUnitName",
               type: "input",
               message: "Organizational Unit Name (name of section):",
               when: (values) => {
                  // only display this question if we answered 'self' to 1st prompt
                  return values.process == "self" && !options.sslUnitName;
               }
            },
            {
               name: "sslCommonName",
               type: "input",
               message: "Common Name (host name):",
               when: (values) => {
                  // only display this question if we answered 'self' to 1st prompt
                  return values.process == "self" && !options.sslCommonName;
               }
            },
            {
               name: "sslEmailAddress",
               type: "input",
               message: "Email Address:",
               when: (values) => {
                  // only display this question if we answered 'self' to 1st prompt
                  return values.process == "self" && !options.sslEmailAddress;
               }
            },
            {
               name: "sslChallengePW",
               type: "input",
               message: "A challenge password:",
               when: (values) => {
                  // only display this question if we answered 'self' to 1st prompt
                  return values.process == "self" && !options.sslChallengePW;
               },
               validate: (value) => {
                  return value.length >= 4
                     ? true
                     : "challenge must be >= 4 bytes long";
               }
            },

            {
               name: "pathKey",
               type: "input",
               message: "type the path to your existing key:",
               when: (values) => {
                  // only display this question if we answered 'exist' to 1st prompt
                  return (
                     values.process == "exist" &&
                     (!options.pathKey ||
                        !fs.statSync(options.pathKey).isFile())
                  );
               },
               validate: (value) => {
                  return fs.statSync(value).isFile() ? true : "unknown file";
               }
            },
            {
               name: "pathCert",
               type: "input",
               message: "type the path to your existing cert:",
               when: (values) => {
                  // only display this question if we answered 'exist' to 1st prompt
                  return (
                     values.process == "exist" &&
                     (!options.pathCert ||
                        !fs.statSync(options.pathCert).isFile())
                  );
               }
            }
         ])
         .then((answers) => {
            // console.log("options", options);
            // console.log("answers:", answers);
            for (var o in options) {
               Options[o] = options[o];
            }
            for (var a in answers) {
               Options[a] = answers[a];
            }
            // console.log("Options:", Options);
            switch (answers.process) {
               case "self":
                  doProcess.push(processSelfSignedCert);
                  break;
               case "none":
                  doProcess.push(processNoSSL);
                  break;
               case "exist":
                  doProcess.push(processExistingCert);
                  break;
            }

            async.series(doProcess, (err) => {
               if (err) {
                  reject(err);
                  return;
               }
               resolve();
            });
         });
   });
};

/**
 * @function checkDependencies
 * verify the system has any required dependencies for generating ssl certs.
 * @param {function} done
 *        node style callback(err)
 */
function checkDependencies(done) {
   // verify we have 'openssl'
   utils.checkDependencies(["openssl"], done);
}

/**
 * @function checkInAppBuilderDir
 * make sure the current directory is the AppBuilder root directory.
 * @param {fn} done
 *        a node style callback(err) to call.
 *        if directory is AB dir we call done()
 *        if !AB dir, then we call done(error)
 */
function checkInAppBuilderDir(done) {
   var AppBuilderDir = {
      assets: 1,
      config: 1,
      nginx: 1,
      "docker-compose.yml": 1,
      "docker-compose.dev.yml": 1
   };
   if (utils.dirLooksLike(AppBuilderDir, process.cwd())) {
      done();
   } else {
      var err = new Error(
         "This command should be run in the AppBuilder root directory."
      );
      done(err);
   }
}

/**
 * @function patchClearSSLEntries
 * remove any unnecessary ssl config entries from the docker-compose.yml file
 * @param {fn} cb
 *        node style callback
 */
function patchClearSSLEntries(cb) {
   console.log("... clearing existing ssl configurations. ");

   utils.filePatch(
      [
         // Start with the docker-compose.yml file:
         // remove listening on the ssl port:
         {
            file: path.join(process.cwd(), "docker-compose.yml"),
            tag: /\n.*-.*".*:443"/,
            replace: "",
            log: ""
         },

         // remove an existing server.pem (.crt) entry
         {
            file: path.join(process.cwd(), "docker-compose.yml"),
            tag: /\n.*-.*type.*:.*bind.*\n.*source.*:.*\n.*target.*:.*\/etc\/ssl.*server\.pem/,
            replace: "",
            log: ""
         },

         // remove an existing server.key entry
         {
            file: path.join(process.cwd(), "docker-compose.yml"),
            tag: /\n.*-.*type.*:.*bind.*\n.*source.*:.*\n.*target.*:.*\/etc\/ssl.*server\.key/,
            replace: "",
            log: ""
         },

         // Now manage the docker-compose.dev.yml
         // remove listening on the ssl port:
         {
            file: path.join(process.cwd(), "docker-compose.dev.yml"),
            tag: /\n.*-.*".*:443"/,
            replace: "",
            log: ""
         },

         // remove an existing server.pem (.crt) entry
         {
            file: path.join(process.cwd(), "docker-compose.dev.yml"),
            tag: /\n.*-.*type.*:.*bind.*\n.*source.*:.*\n.*target.*:.*\/etc\/ssl.*server\.pem/,
            replace: "",
            log: ""
         },

         // remove an existing server.key entry
         {
            file: path.join(process.cwd(), "docker-compose.dev.yml"),
            tag: /\n.*-.*type.*:.*bind.*\n.*source.*:.*\n.*target.*:.*\/etc\/ssl.*server\.key/,
            replace: "",
            log: ""
         }
      ],
      cb
   );
}

/**
 * @function patchExistingCert
 * insert the nginx config settings to use an existing cert/key
 * @param {fn} cb
 *        node style callback
 */
function patchExistingCert(cb) {
   console.log("... adding links to existing .crt and .key");
   utils.filePatch(
      [
         {
            file: path.join(process.cwd(), "docker-compose.yml"),
            tag: /.*depends_on.*\n.*\n.*/,
            replace: `      - type: bind
        source: ${Options.pathCert}
        target: /etc/ssl/certs/server.pem
    depends_on:
      - apiSails
  #/nginx`,
            log: ""
         },
         {
            file: path.join(process.cwd(), "docker-compose.yml"),
            tag: /.*depends_on.*\n.*\n.*/,
            replace: `      - type: bind
        source: ${Options.pathKey}
        target: /etc/ssl/certs/server.key
    depends_on:
      - apiSails
  #/nginx`,
            log: ""
         },
         {
            file: path.join(process.cwd(), "docker-compose.dev.yml"),
            tag: /.*depends_on.*\n.*\n.*/,
            replace: `      - type: bind
        source: ${Options.pathCert}
        target: /etc/ssl/certs/server.pem
    depends_on:
      - apiSails
  #/nginx`,
            log: ""
         },
         {
            file: path.join(process.cwd(), "docker-compose.dev.yml"),
            tag: /.*depends_on.*\n.*\n.*/,
            replace: `      - type: bind
        source: ${Options.pathKey}
        target: /etc/ssl/certs/server.key
    depends_on:
      - apiSails
  #/nginx`,
            log: ""
         }
      ],
      cb
   );
}

/**
 * @function patchUseDefaultConfig
 * configure nginx to use our default.config (with ssl encryption)
 * @param {fn} cb
 *        node style callback
 */
function patchUseDefaultConfig(cb) {
   console.log("... using default ssl based nginx config.");
   utils.filePatch(
      [
         // listening on the ssl port:
         {
            file: path.join(process.cwd(), "docker-compose.yml"),
            tag: /:80"\n/,
            replace: `:80"
      - "443:443"
`,
            log: ""
         },
         {
            file: path.join(process.cwd(), "docker-compose.yml"),
            tag: /\.\/nginx\/default.*\.conf/,
            replace: "./nginx/default.conf",
            log: ""
         },
         // listening on the ssl port:
         {
            file: path.join(process.cwd(), "docker-compose.dev.yml"),
            tag: /:80"\n/,
            replace: `:80"
      - "443:443"
`,
            log: ""
         },
         {
            file: path.join(process.cwd(), "docker-compose.dev.yml"),
            tag: /\.\/nginx\/default.*\.conf/,
            replace: "./nginx/default.conf",
            log: ""
         }
      ],
      cb
   );
}

/**
 * @function patchUseNoSSLConfig
 * configure nginx to use our default-nossl.config (without ssl encryption)
 * @param {fn} cb
 *        node style callback
 */
function patchUseNoSSLConfig(cb) {
   utils.filePatch(
      [
         {
            file: path.join(process.cwd(), "docker-compose.yml"),
            tag: /\.\/nginx\/default.*\.conf/,
            replace: "./nginx/default-nossl.conf"
         },
         {
            file: path.join(process.cwd(), "docker-compose.dev.yml"),
            tag: /\.\/nginx\/default.*\.conf/,
            replace: "./nginx/default-nossl.conf"
         }
      ],
      cb
   );
}

/**
 * @function processSelfSignedCert
 * implement the steps required to generate a self signed cert and configure
 * nginx to use those certs.
 */
function processSelfSignedCert(done) {
   console.log("setting up AppBuilder to use a self signed certificate:");
   var cwd = process.cwd();
   async.series(
      [
         // check for required dependencies
         checkDependencies,
         checkInAppBuilderDir,

         // compile possible options
         (next) => {
            shell.cd(path.join("nginx", "ssl"));
            // shell.exec(
            //   "openssl genrsa -des3 -passout pass:x -out server.pass.key 2048"
            // );
            // shell.exec(
            //   "openssl rsa -passin pass:x -in server.pass.key -out server.key"
            // );
            // shell.exec("rm server.pass.key");

            shell.exec(
               "openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out server.key"
            );

            // shell.exec("openssl req -new -key server.key -out server.csr");
            utils
               .execCommand({
                  command: "openssl",
                  options: [
                     "req",
                     "-new",
                     "-key",
                     "server.key",
                     "-out",
                     "server.csr"
                  ],
                  responses: {
                     "Country Name": Options.sslCountryName + "\n", // Country Name
                     "State or Province Name": Options.sslProvinceName + "\n", // State or Province Name
                     "Locality Name": Options.sslLocalityName + "\n", // Locality Name
                     "Organization Name": Options.sslOrganizationName + "\n", // Organization Name
                     "Organizational Unit Name": Options.sslUnitName + "\n", // Organizational Unit Name
                     "Common Name": Options.sslCommonName + "\n", // Common Name
                     "Email Address": Options.sslEmailAddress + "\n", //
                     "A challenge password": Options.sslChallengePW + "\n",
                     optional: "\n"
                  },
                  outputOnStdErr: true
               })
               .then(next)
               .catch(next);
         },

         (next) => {
            shell.exec(
               "openssl x509 -req -sha256 -days 365 -in server.csr -signkey server.key -out server.crt"
            );
            shell.exec(
               "openssl x509 -in server.crt -out server.pem -outform PEM"
            );

            next();
         },

         // patch config files
         (next) => {
            process.chdir(cwd);
            async.series(
               [patchClearSSLEntries, patchUseDefaultConfig],
               (err) => {
                  next(err);
               }
            );
         }
      ],
      (err) => {
         done(err);
      }
   );
}

function processExistingCert(done) {
   async.series(
      [
         checkInAppBuilderDir,
         patchClearSSLEntries,
         patchUseDefaultConfig,
         patchExistingCert
      ],
      (err) => {
         done(err);
      }
   );

   // update docker-compose.yml => clear all ssl entries
   // use default.config
   // - type: bind
   //   source: ./nginx/default.conf
   //   target: /etc/nginx/conf.d/default.conf

   // update docker-compose.yml
   //       - type: bind
   //         source: {pathCert}
   //         target: /etc/ssl/certs/server.pem

   // update docker-compose.yml
   //       - type: bind
   //         source: {pathKey}
   //         target: /etc/ssl/certs/server.key
}

function processNoSSL(done) {
   async.series(
      [checkInAppBuilderDir, patchClearSSLEntries, patchUseNoSSLConfig],
      (err) => {
         done(err);
      }
   );

   // update docker-compose.yml => clear all ssl entries
   // update default.config to default-nossl.config
   // - type: bind
   //   source: ./nginx/default-nossl.conf
   //   target: /etc/nginx/conf.d/default.conf
}

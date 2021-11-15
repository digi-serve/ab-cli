//
// testSetup
// make sure our environment is prepared for running tests.
//
// options:
//
//
var async = require("async");
// var inquirer = require("inquirer");
var net = require("net");
var path = require("path");
var shell = require("shelljs");
var utils = require(path.join(__dirname, "..", "utils", "utils"));

var Options = {}; // the running options for this command.

//
// Build the Install Command
//
var Command = new utils.Resource({
   command: "testWait",
   params: "",
   descriptionShort: "busy wait until our testing API is working.",
   descriptionLong: `
`,
});

module.exports = Command;

Command.help = function () {
   console.log(`

  usage: $ appbuilder test waitBoot [stack]

  busy wait until our testing port is responsive

  Options:
    [stack] the name of the docker stack we are referencing.

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

               Options.stack = options._.shift();
               if (!Options.stack) {
                  console.log("missing required param: [stack]");
                  Command.help();
                  process.exit(1);
               }
               Options.stack = `test_${Options.stack}`;

               Options.needDeploy = true;
               done();
            },
            checkDependencies,
            checkStack,
            stackDeploy,
            waitAPI,
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
   utils.checkDependencies(["docker"], done);
}

/**
 * @function checkStack
 * see if our stack is running
 * @param {function} done  node style callback(err)
 */
function checkStack(done) {
   var response = shell
      .exec(`docker stack ls`, { silent: true })
      .grep(`${Options.stack}`);
   if (response.stdout != "") {
      // stack is found so:
      Options.needDeploy = false;
   }
   done();
}

/**
 * @function stackDeploy
 * deploy our testing stack
 * @param {function} done  node style callback(err)
 */
function stackDeploy(done) {
   if (Options.needDeploy) {
      shell.exec(
         `docker stack deploy -c docker-compose.dev.yml -c ./test/setup/test-compose.yml ${Options.stack}`,
         {
            silent: true,
         }
      );
   }
   done();
}

/**
 * @function waitAPI
 * attempt to connect to our API
 * @param {function} done  node style callback(err)
 */
function waitAPI(done) {
   var client = new net.Socket();
   var sendingInterval;
   var isConnected = false;
   function connect() {
      client.connect(1337, "127.0.0.1", () => {
         // console.log("Connected");
         isConnected = true;
         sendingInterval = setInterval(() => {
            client.write("GET / HTTP/1.1\r\nHost: localhost\r\n\r\n");
         }, 1000);
      });

      client.on("close", () => {
         // console.log("Connection closed");
         isConnected = false;
         reconnect();
      });

      // client.on("end", () => {
      //    console.log("Connection ended");
      //    reconnect();
      // });

      client.on("error", (err) => {
         if (err.code == "EALREADY") {
            isConnected = true;
         }

         // report on errors we don't expect.
         if (["EALREADY", "ECONNREFUSED"].indexOf(err.code) == -1) {
            console.error(err);
         }
      });

      client.on("data", (data) => {
         data = data.toString();
         // console.log("data:", data);
         if (data.indexOf("HTTP/1.1 200 OK") > -1) {
            clearInterval(sendingInterval);
            done();
         }
      });
   }

   // function that reconnect the client to the server
   var reconnect = () => {
      if (!isConnected) {
         setTimeout(() => {
            // the important line that enables you to reopen a connection
            client.removeAllListeners();
            connect();
         }, 1000);
      }
   };

   connect();
}

/**
 * @function questions
 * Present the user with a list of configuration questions.
 * If the answer for a question is already present in Options, then we
 * skip that question.
 * @param {cb(err)} done
 */
/*
function questions(done) {
   inquirer
      .prompt([
         {
            name: "description",
            type: "input",
            message: "Describe this service :",
            default: "A cool micro service.",
            when: (values) => {
               return (
                  !values.description &&
                  typeof Options.description == "undefined"
               );
            },
         },
         {
            name: "author",
            type: "input",
            message: "Enter your name (name of the author) :",
            default: "Coding Monkey",
            when: (values) => {
               return !values.author && typeof Options.author == "undefined";
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
         {
            name: "serviceSharedFiles",
            type: "confirm",
            message: "Does this service need access to shared files? :",
            default: false,

            when: (values) => {
               return (
                  !values.serviceSharedFiles &&
                  typeof Options.serviceSharedFiles == "undefined"
               );
            },
         },
         {
            name: "shouldInstallAPI",
            type: "confirm",
            message: "Create an initial API endpoint for this service? :",
            default: false,

            when: (values) => {
               return (
                  !values.shouldInstallAPI &&
                  typeof Options.shouldInstallAPI == "undefined"
               );
            },
         },
         {
            name: "useABObjects",
            type: "confirm",
            message: "Will this service work with instances of ABObjects? :",
            default: false,

            when: (values) => {
               return (
                  !values.useABObjects &&
                  typeof Options.useABObjects == "undefined"
               );
            },
         },
      ])
      .then((answers) => {
         for (var a in answers) {
            Options[a] = answers[a];
         }
         // console.log("Options:", Options);
         done();
      })
      .catch(done);
}
*/

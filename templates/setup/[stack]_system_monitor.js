const net = require("net");
const fs = require("fs");
const path = require("path");
const shell = require("shelljs");
// const async = require("async");
const AB = require("ab-utils");
const config = AB.config("bot_manager");
// Don't run if bot is disabled
if (!config.slackBot.enable) {
   console.log("app_system_monitor: bot not enabled");
   process.exit();
}

// Make sure we don't have another service already running:
var lockFile = ".app_system_monitor";
try {
   fs.lstatSync(lockFile);
   // if this works ... we already have another one running.
   console.log("app_system_monitor: already running");
   process.exit();
} catch (e) {
   // console.log("destination not loaded, so skip")
}

shell.exec(`touch ${lockFile}`);
function onExit(code) {
   console.log("CODE:", code);
   fs.unlinkSync(path.join(process.cwd(), lockFile));
   process.exit();
}
process
   .on("SIGINT", () => {
      // ignore SIGINT since ctl-c out of UP.sh command will
      // pass this along to this process which should keep
      // running.
      console.log("Caught a SIGINT. Ignoring.");
   })
   .on("SIGTERM", () => {
      onExit("SIGTERM");
   });

// const SOCKETFILE = "1338";
// const SOCKETFILE = "/tmp/ab.sock";

let connections = {};
let server = null; // eslint-disable-line
let currStream = null;

var isReportRunning = false;
// var checkID = null;

// Net
// Connections to the running bot_manager in our swarm.
//
var isSockConnection = true;
var SOCKETFILE = "/tmp/ab.sock";
var PORT = "1338";
var ACCESSTOKEN = "ThereIsN0Sp00n";
if (
   !config.hostConnection.sharedSock ||
   !config.hostConnection.sharedSock.path
) {
   isSockConnection = false;
   if (
      !config.hostConnection.tcp ||
      !config.hostConnection.tcp.port ||
      !config.hostConnection.tcp.accessToken
   ) {
      console.error(
         "ERROR: config/local.js must specify a bot_manager.hostConnection."
      );
      process.exit(1);
   }
}
if (isSockConnection) {
   SOCKETFILE = config.hostConnection.sharedSock.path;
} else {
   PORT = config.hostConnection.tcp.port;
   ACCESSTOKEN = config.hostConnection.tcp.accessToken;
}

/**
 * checkRunning
 * A repeated check to see if all services are up and running.
 * it performs a : docker service ls
 * and scans stdout to see if any of the service report 0/x
 * If everything seems to be running, a "__running" message is sent
 * to our connected botManager.
 * If a downed service is detected, then a "__offline:[service,...]"
 * is sent to our connected botManager.
 */
var downCheck = /0\/\d/;
var parseLine = /(\w+)\s+(\w+)\s+\w+\s+0\/\d+\s+([\w\/:-]+)/g; // eslint-disable-line
// ID                  NAME                MODE                REPLICAS            IMAGE                           PORTS
// h8bx5qewkeaq        ab_apiSails         replicated          1/1                 skipdaddy/ab-api-sails:master   *:1337->1337/tcp
// parseLine 1:ID,  2:Name,  3:Image
function checkRunning() {
   // make sure our connection to our botManager is ok before trying:
   if (currStream && !currStream.destroyed) {
      shell.exec("docker service ls", { silent: true }, (
         code,
         stdout /* , stderr */
      ) => {
         if (code == 0) {
            if (stdout.search(downCheck) == -1) {
               if (isReportRunning) {
                  console.log("... looks like server is running.");
                  if (currStream) {
                     currStream.write("__running");
                  }

                  isReportRunning = false;
               }
            } else {
               var lines = stdout.split("\n");
               var offlineContainers = [];
               lines.forEach((l) => {
                  var match = parseLine.exec(l);
                  if (match) {
                     offlineContainers.push(`${match[2]}`); // ${match[2]}(${match[3]})
                  }
               });
               if (offlineContainers.length > 0) {
                  if (currStream) {
                     currStream.write(
                        "__offline:" + offlineContainers.join(",")
                     );
                  }
                  isReportRunning = true;
               }
            }
         }
      });
   } else {
      console.log("connection to botManager is not active.");
   }
}

function createServer(socket) {
   console.log("Creating server.");
   var server = net
      .createServer(function (stream) {
         console.log("Connection acknowledged.");
         currStream = stream;

         stream._sentValidToken = false;

         // Store all connections so we can terminate them if the server closes.
         // An object is better than an array for these.
         var self = Date.now();
         connections[self] = stream;
         stream.on("end", function () {
            console.log("Client disconnected.");
            delete connections[self];
         });

         // Messages are buffers. use toString
         stream.on("data", function (msg) {
            msg = msg.toString();

            console.log("Client:", msg);

            // verify access token if necessary
            if (!isSockConnection && !stream._sentValidToken) {
               if (msg == ACCESSTOKEN) {
                  stream._sentValidToken = true;
                  console.log("... accessToken accepted.");
               } else {
                  console.log("... accessToken REJECTED!");
               }
            } else {
               // else execute a command:
               shell.exec(msg, (/* code, stdout, stderr */) => {
                  // console.log("code:", code);
                  // console.log("stdout:", stdout);
                  // console.log("stderr:", stderr);

                  // indicate we need to report when everything is running
                  isReportRunning = true;
                  stream.write("__done"); // command is done
               });
            }
         });

         stream.on("error", function (err) {
            console.log(".onError():", err);
            if (currStream == stream) {
               currStream = null;
            }
         });
      })
      .listen(socket)
      .on("connection", function (/* socket */) {
         console.log("Client connected.");
      });
   return server;
}

// manage unix socket:
console.log("Checking for leftover socket.");
fs.stat(SOCKETFILE, function (err /*, stats */) {
   if (err) {
      // start server
      console.log("No leftover socket found.");
      server = createServer(isSockConnection ? SOCKETFILE : PORT);
      return;
   }
   // remove file then start server
   console.log("Removing leftover socket.");
   fs.unlink(SOCKETFILE, function (err) {
      if (err) {
         // This should never happen.
         console.error(err);
         process.exit(0);
      }
      server = createServer(isSockConnection ? SOCKETFILE : PORT);
      return;
   });
});

// now setup our checkRunning() operation
setInterval(checkRunning, 5 * 1000);

/////
///// Slack Bot
/////
///// The @slack/bolt library isn't working properly from within a docker swarm.
///// So we are folding that connection in here for now.

var servicesToWatch = [];
// {array}
// an array of all the digiserve/(service:tag) that we are running in our
// docker-compose.yml file.

var serviceNames = {};
// {lookup hash}  { docker/service:tag  :  docker_service_name }
// a quick lookup hash with the names of the current docker stack + service
// name for each of our servicesToWatch.

var stack = "ab";
// {string}
// the docker stack reference for this running stack.

function lookupServices() {
   var allServices = [];
   var contents = fs
      .readFileSync(
         //// TODO: replace this:
         // path.join(process.cwd(), "..", "test", "abC2", "docker-compose.yml")
         //// to this:
         path.join(process.cwd(), "docker-compose.yml")
      )
      .toString();

   var serviceExp = new RegExp("image: (.*)", "g");
   var service;
   while ((service = serviceExp.exec(contents))) {
      allServices.push(service[1]);
   }
   return allServices;
}

function lookupServiceName(imageName) {
   if (!serviceNames[imageName]) {
      var command = `docker service ls | grep "${imageName}" | grep " ${stack}_" | awk '{print $2}'`;
      console.log("lookupServiceName ::: ", command);
      serviceNames[imageName] = shell.exec(command).stdout;
      console.log("lookupServiceName --> ", serviceNames[imageName]);
   }
   return serviceNames[imageName];
}

function lookupStack() {
   var foundStack = stack;

   var contents = fs.readFileSync(path.join(process.cwd(), "UP.sh")).toString();

   var serviceExp = new RegExp("File (.*)", "g");
   var results;
   while ((results = serviceExp.exec(contents))) {
      foundStack = results[1];
   }

   return foundStack;
}

function pullDockerUpdate(msg) {
   var repo = null;

   ////
   //// incoming DockerHub notification:
   ////
   // {
   //   type: 'message',
   //   subtype: 'bot_message',
   //   text: '',
   //   ts: '1626851514.000800',
   //   bot_id: 'B0289N0E3PZ',
   //   attachments: [
   //     {
   //       author_name: 'digiserve',
   //       title: "digiserve/ab-definition-manager:develop: Build in 'develop' (f151fad7)",
   //       id: 1,
   //       title_link: 'https://hub.docker.com/repository/registry-1.docker.io/digiserve/ab-definition-manager/builds/ac2a4e26-3737-40a0-b1bf-209989bccc2f',
   //       color: '2eb886',
   //       mrkdwn_in: [Array]
   //     }
   //   ],
   //   channel: 'C028NM9QXPT',
   //   event_ts: '1626851514.000800',
   //   channel_type: 'channel'
   // }

   if (msg.subtype == "bot_message") {
      (msg.attachments || []).forEach((a) => {
         (servicesToWatch || []).forEach((s) => {
            if (a.title.indexOf(s) > -1) {
               repo = s;
            }
         });
      });
   }

   return repo;
}

console.log("Monitoring Docker Containers:");
console.log(servicesToWatch);

if (!config.slackBot.enable || config.slackBot.type !== "Slack") {
   console.log("... slackBot connection DISABLED.");
} else {
   servicesToWatch = lookupServices();
   stack = lookupStack();

   const { App } = require("@slack/bolt");

   const app = new App({
      token: config.slackBot.botToken,
      signingSecret: config.slackBot.signingSecret,
      socketMode: config.slackBot.socketMode,
      appToken: config.slackBot.appToken,
      logLevel: config.slackBot.logLevel, // "debug",
   });

   // Listens to incoming messages
   app.message(/.*/, async ({ message, say }) => {
      // console.log(message);

      // find out if this is a Docker Update on one of our running containers
      var updatedRepo = pullDockerUpdate(message);
      if (updatedRepo) {
         var serviceName = lookupServiceName(updatedRepo);
         if (serviceName) {
            await say(
               `... ${config.slackBot.botName} : reloading ${updatedRepo} `
            );

            var command = `docker service update --image ${updatedRepo} ${serviceName}`;
            console.log("command: ", command);
            shell.exec(command, (/* code, stdout, stderr */) => {
               say(`... ${config.slackBot.botName} : finished `);
            });
         } else {
            console.log(
               `::: could not resolve ${updatedRepo} into a running service ::: `
            );
         }
      }
   });

   (async () => {
      // Start your app
      await app.start(config.slackBot.port);

      console.log("SlackBot connection is running!");
   })();
}

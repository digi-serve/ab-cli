/**
 * @function gitInstallServices
 * given a list of developer/ services to install, git clone + build each
 * @param {array} allServices directory/serviceName
 * @param {fn} cb node style callback when this is finished.
 */
const async = require("async");
const EventEmitter = require("events");
const fs = require("fs");
const path = require("path");
const progress = require("progress");
const shell = require("shelljs");

const execCommand = require(path.join(__dirname, "execCommand.js"));
const gitCheckout = require(path.join(__dirname, "gitCheckout"));
const fileRender = require(path.join(__dirname, "fileRender"));
const fileTemplatePath = require(path.join(__dirname, "fileTemplatePath"));

var checkID = null;
var checkTime = 2 * 60 * 1000; // 2 min

var nodeVersion = "node"; // "node:14.9";
function checkDocker() {
   shell.exec(`docker ps`, { async: true, silent: true }, (
      code,
      stdout /* , stderr */
   ) => {
      // console.log("checkDocker(): stdout", stdout);
      if (stdout.indexOf(` ${nodeVersion} `) == -1) {
         console.log(
            "... docker did not seem to start the node container. If this persists, try restarting docker Desktop."
         );
         checkID = setTimeout(checkDocker, checkTime);
      }
   });
}

function ProcessData(context, data) {
   data = data.toString();
   if (data.indexOf("installs in progress") > -1) {
      var parts = data.split(" ");
      context.total = parseInt(parts[0]);
      context.done = 0;
   }

   if (data.indexOf("finished") > -1) {
      context.done += 1;
   }

   if (data.indexOf("... service :") > -1) {
      context.service = data
         .split(":")
         .pop()
         .split(" ")
         .filter((m) => m)[0];
   }

   if (data.indexOf("all done") > -1) {
      context.endTrigger.emit("done");
   }
}

module.exports = function (allServices = [], options = {}, done) {
   if (!options.silent) options.silent = false;

   // make sure developer directory exists
   var devDir = path.join(process.cwd(), "developer");
   try {
      fs.accessSync(devDir);
   } catch (e) {
      // if it doesn't, create it
      if (e.code == "ENOENT") {
         shell.mkdir(devDir);
      }
   }

   var context = {
      total: 0,
      done: 0,
      endTrigger: new EventEmitter(),
   };

   // figure out which build command to use:
   // var buildCMD =
   //    'docker run --mount type=bind,source="$(pwd)",target=/app -w /app node node npmInstallAll.js';
   var buildCMD = [
      "docker",
      "run",
      "-v",
      "$(pwd):/app",
      // "--mount",
      // 'type=bind,src="$(pwd)",dst=/app',
      "-w",
      "/app",
      nodeVersion,
      "node",
      "npmInstallAll.js",
   ];

   var bar = new progress("  installing git repos [:spinner][:bar] :tickStr", {
      complete: "=",
      incomplete: " ",
      width: 20,
      total: allServices.length * 3 + 7 + 1,
   });
   var tokens = "|/-\\";
   var idxTokens = 0;
   var tickVal = 0;
   var tickStr = "";
   var tick = () => {
      if (!options.silent) {
         // console.log(`::tick::[${tokens[idxTokens]}]`);
         bar.tick(tickVal, { spinner: tokens[idxTokens], tickStr: tickStr });
         idxTokens++;
         if (idxTokens >= tokens.length) {
            idxTokens = 0;
         }
         // reset tickVal to 0 after each update.
         if (tickVal > 0) {
            tickVal = 0;
         }
      }
   };

   var intervalID = setInterval(tick, 200);
   if (!options.silent) {
      bar.tick({ spinner: tokens[idxTokens] });
   } else {
      console.log("... installing git repos (silent)");
   }

   // prevent converting into our "ab_service_xxx" format when dealing with
   // these possible repos
   var specialCases = [
      "ab_platform_web",
      "app_builder",
      "appdev-opsportal",
      "appdev-core",
   ];

   shell.pushd("-q", devDir);
   // console.log(".. in ", process.cwd());
   async.eachSeries(
      allServices,
      (s, cb) => {
         async.series(
            [
               (next) => {
                  // for each link then try to clone a repository
                  tickStr = `git clone ${s}`;
                  var repoName = `ab_service_${s}`;
                  // special case: ab_platform_web

                  if (specialCases.indexOf(s) != -1) {
                     repoName = s;
                  }
                  var gitURL = `https://github.com/appdevdesigns/${repoName}.git`;
                  gitCheckout(process.cwd(), gitURL, s, (err) => {
                     tickVal = 3;
                     next(err);
                  });
               },

               (next) => {
                  tickStr = `${s} -> git recursive checkout`;
                  shell.pushd("-q", path.join(process.cwd(), s));
                  shell.mkdir("-p", "node_modules");

                  var silent = true;

                  shell.exec("git checkout develop", { silent });

                  // NOTE: gitCheckout() above does a git clone --recursive  command.
                  // but if the #master branch didn't have any submodules, then nothing
                  // with be checked out.  We do this after 'git checkout develop' so
                  // we can ensure any new submodules are included.
                  shell.exec("git submodule update --init --recursive", {
                     silent,
                  });

                  next();
               },
            ],
            (err) => {
               shell.popd("-q");
               tickVal = 3;
               cb(err);
            }
         );
      },
      (err) => {
         if (err) {
            done(err);
            return;
         }
         // Now all the develop/* projects are installed.  Perform a single
         // script to npm install them in parallel.

         async.series(
            [
               (next) => {
                  tickStr = `-> creating Install script`;
                  // install the script
                  var scriptContents = fileRender(
                     path.join(fileTemplatePath(), "_seq_npmInstallAll.js"),
                     {}
                  );
                  fs.writeFile(
                     path.join(process.cwd(), "npmInstallAll.js"),
                     scriptContents,
                     (err) => {
                        next(err);
                     }
                  );
               },
               (next) => {
                  tickStr = `-> npm install (takes a while)`;

                  checkID = setTimeout(checkDocker, checkTime);

                  var cmd = buildCMD.shift();

                  // on MacOS, we are having issues sending '"' in the params:
                  // so replace with the expected directory:
                  buildCMD[2] = buildCMD[2].replace('$(pwd)', process.cwd());
                  if ("linux" == process.platform) {
                     // just run the node script directly:
                     cmd = "node";
                     buildCMD = ["npmInstallAll.js"];

                     // clear the checkDocker util:
                     clearTimeout(checkID);
                  }

                  execCommand({
                     command: cmd,
                     options: buildCMD,
                     shouldEcho: false,
                     exitTrigger: "all done",
                     onData: (data) => {
                        ProcessData(context, data);
                        if (context.total > 0) {
                           tickStr = `-> npm install ( ${context.done}/${
                              context.total
                           }  ${context.service ? context.service : ""})`;
                        }
                     },
                     outputOnStdErr: true,
                  }).then(() => {
                     next();
                  });
               },
               (next) => {
                  tickStr = `-> remove Install script`;
                  // remove the script
                  fs.unlinkSync("npmInstallAll.js");
                  next();
               },
            ],
            (err) => {
               tickStr = "... all done.";
               tickVal = 7;
               tick();
               clearInterval(intervalID);
               clearInterval(checkID);
               shell.popd("-q");

               // let's give the progress bar 1s to display itself before continuing on.
               setTimeout(() => {
                  done(err);
               }, 1000);
            }
         );
      }
   );
};

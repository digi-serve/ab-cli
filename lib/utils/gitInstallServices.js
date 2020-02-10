/**
 * @function gitInstallServices
 * given a list of developer/ services to install, git clone + build each
 * @param {array} allServices directory/serviceName
 * @param {fn} cb node style callback when this is finished.
 */
var async = require("async");
var fs = require("fs");
var path = require("path");
var progress = require("progress");
var shell = require("shelljs");

var gitCheckout = require(path.join(__dirname, "gitCheckout"));

module.exports = function(allServices, done) {
   allServices = allServices || [];

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

   // figure out which build command to use:
   var buildCMD =
      'docker run --mount type=bind,source="$(pwd)",target=/app -w /app node npm install';

   if ("win32" == process.platform) {
      buildCMD =
         "docker run --mount type=bind,source=%cd%,target=/app -w /app node npm install";
   }

   var bar = new progress("  installing git repos [:spinner][:bar] :tickStr", {
      complete: "=",
      incomplete: " ",
      width: 20,
      total: allServices.length * 10 + 1
   });
   var tokens = "|/-\\";
   var idxTokens = 0;
   var tickVal = 0;
   var tickStr = "";
   var tick = () => {
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
   };

   var intervalID = setInterval(tick, 200);
   bar.tick({ spinner: tokens[idxTokens] });

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
                  if (s == "ab_platform_web") {
                     repoName = s;
                  }
                  var gitURL = `https://github.com/appdevdesigns/${repoName}.git`;
                  gitCheckout(process.cwd(), gitURL, s, (/* err */) => {
                     tickVal = 3;
                     next();
                  });
               },

               (next) => {
                  tickStr = `${s} -> npm install (takes a while)`;
                  shell.pushd("-q", path.join(process.cwd(), s));
                  shell.mkdir("-p", "node_modules");
                  shell.exec("git checkout develop", { silent: true });
                  shell.exec(
                     buildCMD,
                     { async: true, silent: true },
                     (/*code, stdout, stderr*/) => {
                        next();
                     }
                  );
               }
            ],
            (err) => {
               shell.popd("-q");
               tickVal = 7;
               cb(err);
            }
         );
      },
      (err) => {
         tickStr = "... all done.";
         tick();
         clearInterval(intervalID);
         shell.popd("-q");

         // let's give the progress bar 1s to display itself before continuing on.
         setTimeout(() => {
            done(err);
         }, 1000);
      }
   );
};

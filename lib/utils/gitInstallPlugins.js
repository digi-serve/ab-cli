/**
 * @function gitInstallPlugins
 * given a list of developer/ services to install, git clone + build each
 * @param {array} allPlugins directory/serviceName
 * @param {object} options options
 * @param {boolean} options.silent default false
 * @param {fn} cb node style callback when this is finished.
 */
const async = require("async");
const path = require("path");
const progress = require("progress");
const shell = require("shelljs");

const gitCheckout = require(path.join(__dirname, "gitCheckout"));

const checkID = null;

module.exports = function (allPlugins = [], options = {}, done) {
   if (!options.silent) options.silent = false;

   const pluginsDir = path.join(process.cwd(), "developer", "plugins");
   try {
      shell.mkdir(pluginsDir);
   } catch (e) { /*Already exists*/ }

   const bar = new progress("  installing plugin git repos [:spinner][:bar] :tickStr", {
      complete: "=",
      incomplete: " ",
      width: 20,
      total: allPlugins.length * 6,
   });
   const tokens = "|/-\\";
   let idxTokens = 0;
   let tickVal = 0;
   let tickStr = "";
   const tick = () => {
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

   const intervalID = setInterval(tick, 200);

   if (!options.silent) {
      bar.tick({ spinner: tokens[idxTokens] });
   } else {
      console.log("... installing plugin git repos (silent)");
   }

   shell.pushd("-q", pluginsDir);
   async.eachSeries(
      allPlugins,
      (plugin, cb) => {
         async.series(
            [
               (next) => {
                  // for each link then try to clone a repository
                  tickStr = `git clone ${plugin}`;
                  const repoName = `plugin_${plugin}`;
                  const gitURL = `https://github.com/digi-serve/${repoName}.git`;
                  gitCheckout(process.cwd(), gitURL, plugin, (err) => {
                     tickVal = 3;
                     next(err);
                  });
               },

               (next) => {
                  tickStr = `${plugin} -> npm install`;
                  shell.pushd("-q", path.join(process.cwd(), plugin));
                  const silent = true;
                  shell.exec("npm i", { silent }, (err) => {
                     tickVal = 3;
                     next(err);
                  });

               },
            ],
            (err) => {
               shell.popd("-q");
               tickVal = 6;
               cb(err);
            }
         );
      },
      (err) => {
         tickStr = "... all done.";
         tickVal = 3;
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
};

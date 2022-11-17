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
const shell = require("shelljs");

const { log, progressBar } = require(path.join(__dirname, "logFormatter"));

module.exports = function (allPlugins = [], options = {}, done) {
   if (!options.silent) options.silent = false;

   const pluginsDir = path.join(process.cwd(), "developer", "plugins");
   try {
      shell.mkdir(pluginsDir);
   } catch (e) {
      /*Already exists*/
   }

   if (!options.silent) {
      log("... installing plugin git repos");
   } else {
      log("... installing plugin git repos (silent)");
   }

   shell.pushd("-q", pluginsDir);
   async.eachSeries(
      allPlugins,
      (plugin, cb) => {
         async.series(
            [
               (next) => {
                  // Set up progress bar
                  let tick, bar;
                  if (!options.silent) {
                     bar = progressBar("    git clone   ");
                     bar.start(100, 0, { filename: plugin });
                     // Function for updating git clone progress bar
                     tick = (data) => {
                        data = data.split("\r").pop(); // only read the last line
                        const patterns = [
                           /(Enumerating)\sobjects:\s+(\d+)%/,
                           /(Counting)\sobjects:\s+(\d+)%/,
                           /(Compressing)\sobjects:\s+(\d+)%/,
                           /(Receiving)\sobjects:\s+(\d+)%/,
                           /(Resolving)\sdeltas:\s+(\d+)%/,
                        ];
                        let number = "";
                        let step = "";
                        for (let i = 0; i < patterns.length; i++) {
                           if (patterns[i].test(data)) {
                              const matches = data.match(patterns[i]);
                              step = matches[1];
                              number = parseInt(matches[2]);
                              break;
                           }
                        }
                        let percentDone;
                        switch (step) {
                           case "Enumerating":
                              percentDone = number * 0.05;
                              break;
                           case "Counting":
                              percentDone = 5 + number * 0.05;
                              break;
                           case "Compressing":
                              percentDone = 10 + number * 0.1;
                              break;
                           case "Receiving":
                              percentDone = 20 + number * 0.5;
                              break;
                           case "Resolving":
                              percentDone = 70 + number * 0.25;
                              break;
                           default:
                        }
                        if (percentDone) bar.update(percentDone);
                     };
                  }
                  // for each link then try to clone a repository
                  const repoName = `plugin_${plugin}`;
                  const gitURL = `https://github.com/digi-serve/${repoName}.git`;

                  const command = shell.exec(
                     `git clone --recursive --progress ${gitURL} ${plugin}`,
                     { silent: true },
                     () => {
                        if (!options.silent) {
                           bar.update(100);
                           bar.stop();
                        }
                        next();
                     }
                  );
                  if (!options.silent) {
                     command.stderr.on("data", (data) => tick(data));
                     command.stdout.on("data", (data) => tick(data));
                  }
               },

               (next) => {
                  log(`... npm install ${plugin}`);
                  shell.pushd("-q", path.join(process.cwd(), plugin));
                  const silent = true;
                  shell.exec("npm i", { silent }, (err) => {
                     next(err);
                  });
               },
            ],
            (err) => {
               shell.popd("-q");
               cb(err);
            }
         );
      },
      (err) => {
         shell.popd("-q");
         done(err);
      }
   );
};

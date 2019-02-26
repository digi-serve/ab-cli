//
// install
// perform a new installation of the AB Runtime.
//
// options:
//  --developer   :  setup the environment for a developer
//
var async = require("async");
var fs = require("fs");
var path = require("path");
var shell = require("shelljs");
var utils = require(path.join(__dirname, "utils", "utils"));
var Setup = require(path.join(__dirname, "setup.js"));

var Options = {}; // the running options for this command.

//
// Build the Install Command
//
var Command = new utils.Resource({
  command: "install",
  params: "--developer",
  descriptionShort: "perform a new installation of the AB Runtime.",
  descriptionLong: `
`
});

module.exports = Command;

Command.help = function() {
  console.log(`

  usage: $ appbuilder install [name] [options]

  [name] : the name of the directory to install the AppBuilder Runtime into.

  [options] :
    --develop  : setup the installation for a programming environment

  examples:

    $ appbuilder install ABv2
        - installs AppBuilder into directory ./ABv2

    $ appbuilder install Dev --develop
        - installs AppBuilder into directory ./Dev
        - installs all services locally

`);
};

Command.run = function(options) {
  return new Promise((resolve, reject) => {
    async.series(
      [
        // copy our passed in options to our Options
        done => {
          for (var o in options) {
            Options[o] = options[o];
          }
          Options.name = options._.shift();

          // check for valid params:
          if (!Options.name) {
            console.log("missing required param: [name]");
            Command.help();
            process.exit(1);
          }
          done();
        },
        checkDependencies,
        cloneRepo,
        installDependencies,
        runSetup,
        devInstallServices
      ],
      err => {
        shell.popd();
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
  var err;

  // verify we have 'git'
  var requiredCommands = ["git", "docker"];
  var missingCommands = [];
  requiredCommands.forEach(c => {
    if (!shell.which(c)) {
      missingCommands.push(c);
    }
  });

  if (missingCommands.length) {
    console.error(`
Install:  missing dependencies: ${missingCommands.join(", ")}
`);
    console.log(
      "Make sure these packages are installed before trying to run this command:"
    );
    missingCommands.forEach(c => {
      console.log("  - " + c);
    });
    console.log();
    err = new Error(
      `Install:  missing dependencies: ${missingCommands.join(", ")}`
    );
    err._handled = true;
  }

  done(err);
}

/**
 * @function cloneRepo
 * clone the AB_runtime repo into the specified directory.
 * @param {cb(err)} done
 */
function cloneRepo(done) {
  console.log("... cloning repo");
  shell.exec(
    `git clone https://github.com/Hiro-Nakamura/ab_runtime.git ${Options.name}`
  );
  shell.pushd(Options.name);
  done();
}

/**
 * @function installDependencies
 * clone the AB_runtime repo into the specified directory.
 * @param {cb(err)} done
 */
function installDependencies(done) {
  console.log("... install dependencies");
  shell.exec(`yarn`);
  done();
}

/**
 * @function runSetup
 * perform the "$ appbuilder setup" command.
 * @param {cb(err)} done
 */
function runSetup(done) {
  Setup.run()
    .then(done)
    .catch(done);
}

/**
 * @function devInstallServices
 * install all of our development services.
 * @param {cb(err)} done
 */
function devInstallServices(done) {
  var allServices = [];

  // only do this if they put the --develop flag
  if (!Options.develop) {
    done();
    return;
  }

  try {
    // scan the docker-compose.dev.yml file for links to our local development
    var contents = fs
      .readFileSync(path.join(process.cwd(), "docker-compose.dev.yml"))
      .toString();

    var serviceExp = new RegExp("source.*developer/(.*)", "g");
    var service;
    while ((service = serviceExp.exec(contents))) {
      allServices.push(service[1]);
    }
  } catch (e) {
    done(e);
    return;
  }

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
    'rm node_modules/.yarn-integrity || docker run --mount type=bind,source="$(pwd)",target=/app -w /app node yarn';

  if ("win32" == process.platform) {
    buildCMD =
      "del node_modules\\.yarn-integrity&& docker run --mount type=bind,source=%cd%,target=/app -w /app node yarn";
  }

  shell.pushd(devDir);
  console.log(".. in ", process.cwd());
  async.eachSeries(
    allServices,
    (s, cb) => {
      // for each link then try to clone a repository
      var repoName = `ab_service_${s}`;
      var gitURL = `https://github.com/Hiro-Nakamura/${repoName}.git`;
      shell.exec(`git clone ${gitURL} ${s}`);
      shell.pushd(path.join(process.cwd(), s));
      shell.mkdir("-p", "node_modules");
      shell.exec(buildCMD);
      shell.popd();
      cb();
    },
    err => {
      shell.popd();
      done(err);
    }
  );
}

//
// SSL
// generate ssl connections.
//
// options:
//	--self : generate a self signed cert
//  --pathKey : path to an existing key
//  --pathCert : pato to an existing Cert
//  --none : remove any ssl setup.
//
var async = require("async");
var clear = require("clear");
var path = require("path");
var shell = require("shelljs");
var utils = require(path.join(__dirname, "utils", "utils"));

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

Command.run = function(args, options) {
  var doProcess = [];

  // can we figure out which ssl process we are attempting by the parameters?
  if (options.self || args.self) {
    doProcess.push(processSelfSignedCert);
  } else if (options.none || args.none) {
    doProcess.push(processNoSSL);
  } else if (options.pathKey || args.pathKey) {
    doProcess.push(processExistingCert);
  }

  if (doProcess.length == 0) {
    // ASK
  }

  async.series(doProcess, err => {
    if (err) {
      clear();
      console.log(err);
      process.exit(1);
    }

    console.log(`
done.

`);
    process.exit(0);
  });
};

/**
 * @function checkDependencies
 * verify the system has any required dependencies for generating ssl certs.
 * @param {function} done  node style callback(err)
 */
function checkDependencies(done) {
  var err;

  // verify we have 'openssl'
  if (!shell.which("openssl")) {
    err = new Error("SSL:  openssl is required to generate ssl certs.");
  }

  done(err);
}

function processSelfSignedCert(done) {
  async.series(
    [
      // check for required dependencies
      checkDependencies

      // compile possible options
    ],
    err => {
      done(err);
    }
  );
}

function processExistingCert(done) {
  done();
}

function processNoSSL(done) {
  done();
}

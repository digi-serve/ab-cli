//
// This is a helper file for preparing all the npm projects in the developer
// directory.
//
// It is intended to be used during the install process to perform an npm install
// on each of the included projects.
const { exec } = require("child_process");
var path = require("path");
var fs = require("fs");

var cwd = process.cwd();

var countFinished = 0;
var countStarted = 0;

function done(/* err */) {
   // if (err) {
   //    console.log(err);
   //    // process.exit(err.code);
   //    return;
   // }

   countFinished++;
   if (countFinished >= countStarted) {
      console.log("... all done");
      // process.exit();
   }
}

function runInstall(name) {
   var command = `cd ${path.join(cwd, name)}; npm install`;
   // console.log(command);
   /* var install = */ exec(command, function(error /*, stdout, stderr */) {
      if (error) {
         console.log(error.stack);
         console.log("Error code: " + error.code);
         console.log("Signal received: " + error.signal);
         done(error);
         return;
      }
      console.log(`... finished ${name} npm install`);
      done();
   });

   // install.on("exit", function (code) {
   //    console.log(`${command} :: exited with exit code[${code}]`);
   //    if (code) {
   //       done({ code });
   //       return;
   //    }
   //    done();
   // });
}

// find all directories that are NPM modules:
var allfiles = fs.readdirSync(cwd);
var files = [];

// console.log(`${allfiles.length} files to scan ...`);
for (var f in allfiles) {
   var name = allfiles[f];
   var stats = fs.statSync(path.resolve(cwd, name));
   if (stats.isDirectory()) {
      if (fs.existsSync(path.resolve(cwd, name, "package.json"))) {
         // this is a npm module, so init!
         countStarted++;
         files.push(name);
      }
   }
}

console.log(`${files.length} installs in progress`);

// kick off parallel operations:
files.forEach((f) => {
   runInstall(f);
});

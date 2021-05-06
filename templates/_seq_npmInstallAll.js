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

function runInstall(name, done) {
   var command = `cd ${path.join(cwd, name)}; npm install --force`;

   /* var install = */ exec(command, function (error /*, stdout, stderr */) {
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
         files.push(name);
      }
   }
}

function doFile(files, cb) {
   if (files.length == 0) {
      cb();
   } else {
      var file = files.shift();
      console.log(`... service : ${file} `);
      runInstall(file, (err) => {
         if (err) {
            cb(err);
            return;
         }
         doFile(files, cb);
      });
   }
}
console.log(`${files.length} installs in progress`);

doFile(files, (err) => {
   if (err) {
      console.error(err);
      process.exit(1);
   }
   console.log("... all done");
});

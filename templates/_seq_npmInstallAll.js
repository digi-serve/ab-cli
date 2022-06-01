//
// This is a helper file for preparing all the npm projects in the developer
// directory.
//
// It is intended to be used during the install process to perform an npm install
// on each of the included projects.
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

const cwd = process.cwd();

function runInstall(name, done) {
   const workDirectory = path.join(cwd, name);
   const commands = [`cd ${workDirectory}`, "npm install --force"];
   const checkScript = require(path.join(workDirectory, "package.json")).scripts
      .submoduleNPMInstall ?? null;

   if (checkScript) commands.push("npm run submoduleNPMInstall");

   /* const install = */ exec(commands.join(" && "), function (error /*, stdout, stderr */) {
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
const allfiles = fs.readdirSync(cwd);
const files = [];

// console.log(`${allfiles.length} files to scan ...`);
for (const f in allfiles) {
   const name = allfiles[f];
   const stats = fs.statSync(path.resolve(cwd, name));
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
      const file = files.shift();
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

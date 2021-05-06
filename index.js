#! /usr/bin/env node
// to add on debugging: #! /usr/bin/env node  --inspect-brk

const fs = require("fs");
const path = require("path");
const clear = require("clear");
const chalk = require("chalk");
const junk = require("junk");
const utils = require(path.join(__dirname, "lib", "utils", "utils"));

// process command line arguments
let args = require("minimist")(process.argv.slice(2));
// console.log(args);

//// Load the command list:
var listFiles = fs.readdirSync(path.join(__dirname, "lib")).filter(junk.not);
var commandHash = {};
listFiles.forEach((file) => {
   var stat = fs.statSync(path.join(__dirname, "lib", file));
   if (stat.isFile()) {
      var command = file.split(".")[0];
      commandHash[command] = require(path.join(__dirname, "lib", command));
   }
});
// console.log(commandHash);

//// find if command exists
var commandArg = args._.shift();
if (commandHash[commandArg]) {
   // Run the Command
   var command = commandHash[commandArg];
   command
      .run(args)
      .then(() => {
         console.log(`
done.

`);
         process.exit(0);
      })
      .catch((err) => {
         // if the calling command already displayed an error message
         // we don't need to display this here.
         if (!err._handled) {
            clear();
            console.log(err);
         }
         process.exit(1);
      });
} else {
   // display help screen with list of available commands:
   clear();
   console.log(`
$ appbuilder ${chalk.red.bold(commandArg)} ${process.argv.slice(3).join(" ")}

Unknown command: ${chalk.red.bold(commandArg)}

Available commands:
`);
   var maxLength = 0;
   for (var cmd in commandHash) {
      if (cmd.length > maxLength) {
         maxLength = cmd.length;
      }
   }

   for (var c in commandHash) {
      var cPad = utils.stringPad(c, maxLength + 1);
      console.log(`    ${cPad}: ${commandHash[c].descriptionShort}`);
   }

   console.log(`

`);
   console.log(
      `For more info on a specific command type: ${
         chalk.green("appbuilder [command]") + chalk.yellow.bold(" --help ")
      }`
   );
   console.log(`

`);
}

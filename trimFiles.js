#! /usr/bin/env node

let args = require("minimist")(process.argv.slice(2));
var fs = require("fs");
var path = require("path");
var writeFileTrim = require("write-file-trim");

args._.forEach((filePath) => {
    var pathToFile = path.join(__dirname, filePath);

    var contents = fs.readFileSync(pathToFile, "utf8");

    writeFileTrim(pathToFile, contents, (err /* , data */) => {
        console.log(err || "Trimmed:" + filePath);
    });
});

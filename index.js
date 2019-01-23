#! /usr/bin/env node

var path = require("path");

// process command line arguments
var args = require("minimist")(process.argv.slice(2));
console.log(args);

var ssl = require(path.join(__dirname, "lib", "ssl"));

console.log(ssl.help());

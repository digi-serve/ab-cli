var express = require("express");
var bodyParser = require("body-parser");
var fs = require("fs");
// var path = require("path");

//
// make sure we operate from the www/ directory
//
var isDir = false;
var attempt = 0;
while (!isDir && attempt < 3) {
    var files = fs.readdirSync(process.cwd());
    if (files.indexOf("www") > -1) {
        process.chdir("www");
    }
    if (files.indexOf("webserver.js") > -1) {
        isDir = true;
    }
}
if (attempt >= 3) {
    console.log("this must run from our [project]/www directory.");
    console.log("move there and run this again.");
    console.log();
    process.exit(1);
}

//
// create the webserver
//
var app = express();

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Headers",
        "Content-Type, X-Requested-With"
    );
    next();
});

app.use(express.static("."));

// app.use(bodyParser.urlencoded({
//     extended: true
// }));
app.use(bodyParser.json());

app.listen(9889, () => {
    console.log("Static webserver on 9889");
});

app.post("/log", function(req, res) {
    console.log("body:", req.body.message);

    res.send({ status: "ok" });
});

var os = require("os");
var ifaces = os.networkInterfaces();

Object.keys(ifaces).forEach(function(ifname) {
    var alias = 0;

    ifaces[ifname].forEach(function(iface) {
        if ("IPv4" !== iface.family || iface.internal !== false) {
            // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
            return;
        }

        if (alias >= 1) {
            // this single interface has multiple ipv4 addresses
            console.log(ifname + ":" + alias, iface.address);
        } else {
            // this interface has only one ipv4 adress
            console.log(ifname, iface.address);
        }
        ++alias;
    });
});

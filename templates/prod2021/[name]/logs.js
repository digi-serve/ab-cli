#!/usr/bin/env node
//
// Logs.js
// Connect to the running containers and pipe their logs to the console.
//
const async = require("async");
const os = require("os");
const shell = require("shelljs");
const { spawn } = require("child_process");

var stdout = null;
if (os.platform() == "win32") {
    // windows method of gathering the service names:
    stdout = shell
        .exec(
            `for /f "tokens=2" %a in ('docker service ls ^| findstr "<%= stack %>_" ') do @echo %a`
        )
        .stdout.replace(/\r/g, "");
} else {
    // common unix method of gathering the service names:
    stdout = shell.exec(`docker service ls | grep "<%= stack %>_" | awk '{ print $2 }'`)
        .stdout;
}

var allServiceIDs = stdout.split("\n");

var allServices = {};

var maxIDLength = -10;

var closeDown = (signal) => {
    // our process exit handler
    // be sure to kill all our sub processes

    allServiceIDs.forEach((id) => {
        if (allServices[id]) {
            console.log(`closing logger(${id}) with ${signal}`);
            allServices[id].kill(signal);
        }
    });
};

function pad(text, length) {
    while (text.length < length) {
        text += " ";
    }
    return text;
}
function cleanText(id, text) {
    var lines = text.split("\n");
    var output = [];
    lines.forEach((line) => {
        if (line.length > 0) {
            var parts = line.split("|");
            if (parts.length > 1) {
                parts.shift();
            }
            output.push(`${pad(id, maxIDLength)} : ${parts.join("|")}`);
        }
    });

    return output.join("\n");
}

async.eachSeries(
    allServiceIDs,
    (id, cb) => {
        if (id == "") {
            cb();
            return;
        }

        // create a new process for logging the given service id
        var options = ["service", "logs", "-f", "--tail", "50", id]; // `docker service logs -f ${id}`;
        var logger = spawn("docker", options, {
            // stdio: ["ignore", "ignore", "ignore"]
        });
        logger.stdout.on("data", (data) => {
            console.log(cleanText(id, data.toString()));
        });

        logger.stderr.on("data", (data) => {
            console.error(cleanText(id, data.toString()));
        });

        if (id.length > maxIDLength) {
            maxIDLength = id.length;
        }

        allServices[id] = logger;
        cb();
    },
    (err) => {
        if (err) {
            console.error(err);
            console.log();
            closeDown("SIGINT");
            process.exit();
        }
    }
);

process.on("SIGINT", closeDown);
process.on("SIGTERM", closeDown);

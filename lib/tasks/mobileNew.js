//
// mobileNew
// create a new mobile app development directory
//
// options:
//
//
var async = require("async");
var fs = require("fs");
var inquirer = require("inquirer");
var path = require("path");
var shell = require("shelljs");
var utils = require(path.join(__dirname, "..", "utils", "utils"));

var Options = {}; // the running options for this command.

// Depending on which platform we are in, there are 2 ways to specify the
// Docker path:
var DockerCmd =
    'docker run --mount type=bind,source="$(pwd)",target=/app  -w /app skipdaddy/ab-mobile-env:develop';
var DockerCmdWindows =
    "docker run --mount type=bind,source=%cd%,target=/app -w /app skipdaddy/ab-mobile-env:develop";

//
// Build the Install Command
//
var Command = new utils.Resource({
    command: "mobileNew",
    params: "",
    descriptionShort: "create a new mobile app Development directory.",
    descriptionLong: `
`
});

module.exports = Command;

Command.help = function() {
    console.log(`

  usage: $ appbuilder mobile new [appName] [options]

  create a new mobile app development directory.

  Options:
    [appName] the name of the Mobile App.

  [options] :
    --dest          : (optional) path to the directory to install in
                      [default] = current dir

    --appID         : (optional) default application id (org.orgName.appName)
                      for this application.

    --platforms     : (optional) A list of platforms to install.
                      valid entries: [ android, ios, browser ]
                      it is best to enter these enclosed in "".
                      ex: --platforms "android,ios,browser"

    --noSentry      : (optional) skip installing Sentry.io
    --sentryDNS [dnsString] : (optional) install Sentry.io and use [dnsString]
                      for Sentry.init()

    --countlyURL    : (optional) the countly url of your web app.
    --countlyAppKey : (optional) the country App_Key of your app.

`);
};

Command.run = function(options) {
    return new Promise((resolve, reject) => {
        async.series(
            [
                // copy our passed in options to our Options
                (done) => {
                    for (var o in options) {
                        Options[o] = options[o];
                    }

                    // if they are just asking for help, then show the help.
                    if (options.help) {
                        Command.help();
                        process.exit();
                        return;
                    }

                    Options._ = Options._ || [];

                    // make sure platoforms is an array
                    if (Options.platforms) {
                        Options.platforms = Options.platforms.split(",");
                    }

                    var optionOrder = ["appName"];

                    while (Options._.length > 0 && optionOrder.length > 0) {
                        var key = optionOrder.shift();
                        var value = Options._.shift();
                        Options[key] = value;
                    }

                    done();
                },
                checkDependencies,
                questions,
                moveToInstallDirectory,
                createDirectory,
                moveToProjectDirectory,
                installPlugins,
                installPluginSentry,
                installPlatforms,
                installNodeModules,

                modifyFiles,

                //// LeFT OFF HERE: now slowly install files + webpack build
                //// and check out webserver

                removeFiles,
                copyTemplates,
                gitCheckoutMobilePlatform
            ],
            (err) => {
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
    utils.checkDependencies(["cordova", "git"], done);
}

/**
 * @function copyTemplates
 * copy our template files to our project
 * @param {function} done  node style callback(err)
 */
function copyTemplates(done) {
    var copyTheseFiles = ["MaterialIcons-Regular", ".css", "webfonts"];
    utils.fileCopyTemplates("mobileNew", Options, copyTheseFiles, done);
}

/**
 * @function createDirectory
 * Run the cordova command to create the initial project directory
 * @param {function} done  node style callback(err)
 */
function createDirectory(done) {
    if (process.platform == "win32") {
        shell.exec(
            `${DockerCmdWindows} cordova create ${Options.appName} ${
                Options.appID
            } ${Options.appName}`
        );
    } else {
        shell.exec(
            `${DockerCmd} cordova create ${Options.appName} ${Options.appID} ${
                Options.appName
            }`
        );
    }
    done();
}

/**
 * @function gitCheckoutMobilePlatform
 * git install our appbuilder_platform_mobile
 * @param {function} done  node style callback(err)
 */
function gitCheckoutMobilePlatform(done) {
    var pathDir = path.join(process.cwd(), "www", "lib");
    utils.gitCheckout(
        pathDir,
        "https://github.com/appdevdesigns/appbuilder_platform_mobile.git",
        "platform",
        done
    );
}

/**
 * @function installNodeModules
 * install our desired node modules.
 * @param {function} done node style callback(err)
 */
function installNodeModules(done) {
    var nodeModules = [
        "@babel/core",
        "@babel/preset-env",
        "async",
        "babel-loader",
        "crypto-js",
        "es6-promise",
        "eventemitter2",
        "express",
        "framework7",
        "highcharts",
        "html2canvas",
        "jquery",
        "lodash",
        "moment",
        "shake.js",
        "uuid",
        "webix",
        "webpack"
    ];

    var nodeDevModules = [
        "webpack-cli",
        "eslint",
        "eslint-plugin-prettier",
        "prettier",
        "eslint-config-prettier"
    ];

    if (Options.platforms.length > 0) {
        if (process.platform == "win32") {
            shell.exec(`${DockerCmdWindows} yarn add ${nodeModules.join(" ")}`);
            shell.exec(
                `${DockerCmdWindows} yarn add -D ${nodeDevModules.join(" ")}`
            );
        } else {
            shell.exec(`${DockerCmd} yarn add ${nodeModules.join(" ")}`);
            shell.exec(`${DockerCmd} yarn add -D ${nodeDevModules.join(" ")}`);
        }
    }

    // now copy these files to our www/ directory:
    var nodeDir = path.join(process.cwd(), "node_modules");
    var jsDir = path.join(process.cwd(), "www", "js");
    var fileCopies = [
        {
            from: path.join(
                nodeDir,
                "es6-promise",
                "dist",
                "es6-promise.min.js"
            ),
            to: path.join(jsDir, "es6-promise.js")
        },
        {
            from: path.join(
                nodeDir,
                "framework7",
                "js",
                "framework7.bundle.min.js"
            ),
            to: path.join(jsDir, "framework7.bundle.min.js")
        },
        {
            from: path.join(
                nodeDir,
                "framework7",
                "css",
                "framework7.bundle.min.css"
            ),
            to: path.join(jsDir, "..", "css", "framework7.bundle.min.css")
        },
        {
            from: path.join(nodeDir, "highcharts", "highcharts.js"),
            to: path.join(jsDir, "highcharts", "highcharts.js")
        },
        {
            from: path.join(nodeDir, "highcharts", "highcharts-more.js"),
            to: path.join(jsDir, "highcharts", "highcharts-more.js")
        },
        {
            from: path.join(nodeDir, "highcharts", "modules", "solid-gauge.js"),
            to: path.join(jsDir, "highcharts", "modules", "solid-gauge.js")
        },
        {
            from: path.join(nodeDir, "jquery", "dist", "jquery.min.js"),
            to: path.join(jsDir, "jquery.min.js")
        },
        {
            from: path.join(nodeDir, "lodash", "lodash.min.js"),
            to: path.join(jsDir, "lodash.js")
        },
        {
            from: path.join(nodeDir, "moment", "moment.js"),
            to: path.join(jsDir, "moment.js")
        },
        {
            from: path.join(nodeDir, "webix", "webix.min.js"),
            to: path.join(jsDir, "webix.js")
        }
    ];

    fileCopies.forEach((file) => {
        try {
            fs.accessSync(path.dirname(file.to));
            shell.cp("-R", file.from, file.to);
        } catch (e) {
            shell.mkdir("-p", path.dirname(file.to));
            shell.cp("-R", file.from, file.to);
        }
    });

    // install fontawesome:
    // https://use.fontawesome.com/releases/v5.9.0/fontawesome-free-5.9.0-web.zip

    done();
}

/**
 * @function installPlatforms
 * install the requested platforms for this project.
 * @param {function} done node style callback(err)
 */
function installPlatforms(done) {
    if (Options.platforms.length > 0) {
        if (process.platform == "win32") {
            shell.exec(
                `${DockerCmdWindows} cordova platform add ${Options.platforms.join(
                    " "
                )}`
            );
        } else {
            shell.exec(
                `${DockerCmd} cordova platform add ${Options.platforms.join(
                    " "
                )}`
            );
        }
    }
    done();
}

/**
 * @function installPlugins
 * make sure all our required plugins are installed
 * @param {function} done node style callback(err)
 */
function installPlugins(done) {
    // these are the plugins we want to install:
    var listPlugins = [
        "cordova-plugin-statusbar",
        "cordova-plugin-whitelist",
        "cordova-plugin-code-push",
        "cordova-plugin-qrscanner",
        "cordova-plugin-deeplinks",
        "onesignal-cordova-plugin",
        "cordova-android-support-gradle-release",
        "cordova-android-play-services-gradle-release",
        "cordova-plugin-camera",
        "cordova-plugin-network-information",
        "cordova-plugin-ios-disableshaketoedit",
        "cordova-plugin-add-swift-support",
        "cordova-plugin-calendar",
        "https://github.com/Countly/countly-sdk-js.git"
    ];

    if (process.platform == "win32") {
        shell.exec(
            `${DockerCmdWindows} cordova plugin add ${listPlugins.join(" ")}`
        );
    } else {
        shell.exec(`${DockerCmd} cordova plugin add ${listPlugins.join(" ")}`);
    }
    done();
}

/**
 * @function installPluginSentry
 * install and configure Sentry if the developer wants it.
 * @param {function} done node style callback(err)
 */
function installPluginSentry(done) {
    Options.installSentry = true;
    if (Options.noSentry) {
        Options.installSentry = false;
    }

    // these are the plugins we want to install:
    var listPlugins = ["sentry-cordova"];

    if (process.platform == "win32") {
        shell.exec(
            `${DockerCmdWindows} cordova plugin add ${listPlugins.join(" ")}`
        );
    } else {
        shell.exec(`${DockerCmd} cordova plugin add ${listPlugins.join(" ")}`);
    }
    done();
}

/**
 * @function moveToInstallDirectory
 * these commands should operate from the desired install directory.
 * @param {function} done  node style callback(err)
 */
function moveToInstallDirectory(done) {
    // Remember our current directory
    Options._cwd = process.cwd();

    // if a destination directory was given move there,
    // otherwise we assume the current directory is the
    // install directory.
    if (Options.dest) {
        try {
            process.chdir(Options.dest);
        } catch (e) {
            console.log(`
  !! ENOTFOUND: unknown directory : ${Options.dest}
`);
            var err = new Error(
                "ENOTFOUND: unknown directory : " + Options.dest
            );
            err._handled = true;
            done(err);
            return;
        }
    }

    done();
}

/**
 * @function modifyConfig
 * Make needed modifications to the config.xml file.
 *
 */
function modifyFiles(done) {
    // Perform our whitelist actions:
    //// NOTE: looks like cordova already includes these settings:
    // var whiteList = `<content src="index.html" />
    // <access origin="*" />
    // <allow-intent href="http://*/*" />
    // <allow-intent href="https://*/*" />
    // <allow-intent href="tel:*" />
    // <allow-intent href="sms:*" />
    // <allow-intent href="mailto:*" />
    // <allow-intent href="geo:*" />`;

    // package.json with additional scripts:
    var newScripts = `"scripts": {
        "build": "webpack --mode=development",
        "watch": "webpack --mode=development --watch --progress",
        "devserver": "node www/webserver.js",`;

    utils.filePatch([
        // {
        //     file: path.join(process.cwd(), "config.xml"),
        //     tag: /<content\s*src="index.html"\s*\/>/,
        //     replace: whiteList,
        //     log: "step: whitelist everything"
        // },
        {
            file: path.join(process.cwd(), "package.json"),
            tag: /"scripts":\s*{/,
            replace: newScripts,
            log: "step: adding additional package.json scripts"
        }
    ]);
    done();
}

/**
 * @function moveToProjectDirectory
 * The remaining cordova commands need to be run within the
 * Project Directory.
 * @param {function} done  node style callback(err)
 */
function moveToProjectDirectory(done) {
    // if (utils.dirMoveToRoot()) {
    //   done();
    //   return;
    // }
    process.chdir(Options.appName);
    done();
}

/**
 * @function removeFiles
 * Remove files we don't want.
 * We do this before we copy our templates over.
 * @param {function} done  node style callback(err)
 */
function removeFiles(done) {
    var unwantedFiles = [
        path.join(process.cwd(), "www", "index.html"),
        path.join(process.cwd(), "www", "css", "index.css")
    ];
    unwantedFiles.forEach((file) => {
        fs.unlinkSync(file);
    });
    done();
}

/**
 * @function questions
 * request any additional information from the user that is missing
 * @param {function} done
 */
function questions(done) {
    // NOTE: we break these up into 2 sections, the first will
    // gather some data we will use as defaults for the next
    // level of questions.
    inquirer
        .prompt([
            {
                name: "orgName",
                type: "input",
                message: "What is your organization name (no spaces):",
                filter: (input) => {
                    Options.orgName = input;
                    return input;
                },
                validate: (input) => {
                    return input != "" ? true : "enter a name here.";
                },
                when: (values) => {
                    return (
                        !values.orgName &&
                        typeof Options.orgName == "undefined" &&
                        typeof Options.appID == "undefined"
                    );
                }
            },
            {
                name: "orgType",
                type: "input",
                message:
                    "What is your organization/company domain (com, org, io, etc...) :",
                filter: (input) => {
                    Options.orgType = input;
                    return input;
                },
                validate: (input) => {
                    return input != "" ? true : "enter a domain here.";
                },
                when: (values) => {
                    return (
                        !values.orgType &&
                        typeof Options.orgType == "undefined" &&
                        typeof Options.appID == "undefined"
                    );
                }
            }
        ])
        .then((answers) => {
            for (var a in answers) {
                Options[a] = answers[a];
            }

            return inquirer
                .prompt([
                    {
                        name: "appID",
                        type: "input",
                        message: "What should the appID be :",
                        default: `${Options.orgType}.${Options.orgName}.${
                            Options.appName
                        }`,
                        validate: (input) => {
                            if (input == `com.yourOrg.${Options.appName}`) {
                                return "that is just an example, enter your own";
                            }

                            return input != ""
                                ? true
                                : `enter a valid entry like: com.yourOrg.${
                                      Options.appName
                                  }`;
                        },
                        when: (values) => {
                            return (
                                !values.appID &&
                                typeof Options.appID == "undefined"
                            );
                        }
                    },
                    {
                        name: "platforms",
                        type: "checkbox",
                        message: "Which platforms should be included:",
                        choices: ["android", "ios", "browser"],
                        when: (values) => {
                            return (
                                !values.platforms &&
                                typeof Options.platforms == "undefined"
                            );
                        }
                    },
                    {
                        name: "codepushKeyIOS",
                        type: "input",
                        message: "Enter the CodePush Key for iOS:",
                        when: (values) => {
                            // return (if values.platforms have ios OR
                            //          Options.platforms have ios)
                            // AND Options.codepushKeyIOS is not provided
                            return (
                                ((values.platforms &&
                                    values.platforms.indexOf("ios") > -1) ||
                                    (Options.platforms &&
                                        Options.platforms.indexOf("ios") >
                                            -1)) &&
                                typeof Options.codepushKeyIOS == "undefined"
                            );
                        }
                    },
                    {
                        name: "codepushKeyAndroid",
                        type: "input",
                        message: "Enter the CodePush Key for Android:",
                        when: (values) => {
                            return (
                                ((values.platforms &&
                                    values.platforms.indexOf("android") > -1) ||
                                    (Options.platforms &&
                                        Options.platforms.indexOf("android") >
                                            -1)) &&
                                typeof Options.codepushKeyAndroid == "undefined"
                            );
                        }
                    },
                    {
                        name: "networkType",
                        type: "list",
                        message: "What type of networking strategy:",
                        choices: ["rest", "relay"],
                        default: "relay",
                        when: (values) => {
                            return (
                                !values.networkType &&
                                typeof Options.networkType == "undefined"
                            );
                        }
                    },
                    {
                        name: "networkCoreURL",
                        type: "input",
                        message: "Enter the url to the AppBuilder server:",
                        default: "http://localhost:1337",
                        when: (values) => {
                            return (
                                values.networkType == "rest" &&
                                typeof Options.networkCoreURL == "undefined"
                            );
                        }
                    },
                    {
                        name: "networkRelayURL",
                        type: "input",
                        message: "Enter the url to the Relay server:",
                        default: "http://localhost:1337",
                        when: (values) => {
                            return (
                                values.networkType == "relay" &&
                                typeof Options.networkRelayURL == "undefined"
                            );
                        }
                    },
                    {
                        name: "installSentry",
                        type: "confirm",
                        message:
                            "Do you want to install Sentry.io (for debugging crashes)?",
                        default: true,
                        when: (values) => {
                            return (
                                !values.installSentry &&
                                typeof Options.noSentry == "undefined" &&
                                typeof Options.sentryDSN == "undefined"
                            );
                        }
                    },
                    {
                        name: "sentryDSN",
                        type: "input",
                        message:
                            "Enter your Sentry.dsn parameter (https://....@sentry.io/....):",
                        when: (values) => {
                            return (
                                values.installSentry &&
                                typeof Options.noSentry == "undefined" &&
                                typeof Options.sentryDSN == "undefined"
                            );
                        }
                    },
                    {
                        name: "countlyURL",
                        type: "input",
                        message: "Enter your Countly URL (http://....) :",
                        when: (values) => {
                            return (
                                !values.countlyURL &&
                                typeof Options.countlyURL == "undefined"
                            );
                        }
                    },
                    {
                        name: "countlyAppKey",
                        type: "input",
                        message: "Enter your Countly App_Key :",
                        when: (values) => {
                            return (
                                !values.countlyAppKey &&
                                typeof Options.countlyAppKey == "undefined"
                            );
                        }
                    },
                    {
                        name: "onesignalAppID",
                        type: "input",
                        message: "Enter your OneSignal App ID :",
                        when: (values) => {
                            return (
                                !values.onesignalAppID &&
                                typeof Options.onesignalAppID == "undefined"
                            );
                        }
                    }
                ])
                .then((answers2) => {
                    for (var a in answers2) {
                        Options[a] = answers2[a];
                    }

                    if (Options.noSentry) {
                        Options.installSentry = false;
                    }

                    if (Options.networkType == "rest") {
                        Options.networkRelayURL = "http://localhost:1337";
                    } else {
                        Options.networkCoreURL = "http://localhost:1337";
                    }

                    // console.log("Options:", Options);
                    done();
                });
        })
        .catch(done);
}

/**
 * @function execCommand
 *
 * Issues a single spawn command.
 *
 * @codestart
 *
 * var responses = {
 *           'name:':'\n',
 *           'entry point:': 'module.js\n',
 *           'test command:': 'make test\n',
 *           'keywords': '\n',
 *           'license': '\n',
 *           'Is this ok?': '\n'
 *   };
 * utils.execCommand({
 *       command:'npm',
 *       options:['init'],
 *       shouldEcho:false,
 *       responses:responses,
 *       exitTrigger:'ok?',
 *   })
 *   .then(function(code){
 *       done();
 *   })
 *   .catch(function(err){
 *       AD.log.error('<red> NPM init exited with an error</red>');
 *       AD.log(err);
 *       process.exit(1);
 *   })
 * @codeend
 *
 * @param {object} opt  the options to send this command:
 *
 *        opt.command     {string} the command to issue
 *
 *        opt.options     {array}  an array of additional command line
 *                                 arguments
 *
 *        --- optional arguments ---
 *
 *        [opt.exitTrigger] {string} consider this matching text string
 *                                 the end of the script
 *        [opt.onData]    {function} a fn() to pass data returned back
 *                                 from the script to.
 *        [opt.onStdErr]  {function} a fn() to pass error data returned back
 *                                 from the script to.
 *
 *        [opt.outputOnStdErr] {bool} treat stdErr as normal data output? [false]
 *
 *        [opt.responses] {object} a hash of text keys and responses to
 *                                 send the running script
 *
 *        [opt.shouldEcho]{bool}   echo the text to the screen? [true]
 *        [opt.textFilter]{array}  of strings that will prevent echoing
 *                                 of data to console.
 *                                 only matters if shouldEcho == true
 *        [opt.log]       {string} display on console before running
 *                                 command.
 *        [opt.shouldPipe]{bool}   pipe the current stdin to the spawned
 *                                 process?  [false]
 *                                 useful for command line tools that
 *                                 want to pipe the users input to the
 *                                 spawned script.
 *
 *        [opt.spawnOpts] {object} A hash/dictionary of options to pass on
 *                                 to the underlying spawn() command. This
 *                                 is different from `opt.options`.
 * @return {Promise}
 */
var path = require("path");
var spawn = require("cross-spawn");
var stringReplaceAll = require(path.join(__dirname, "stringReplaceAll"));
module.exports = function (opt) {
   // command, options, responses, exitTrigger
   var cmd;

   return new Promise((resolve, reject) => {
      // make sure optional values are defaulted
      opt.responses = opt.responses || null;

      if (typeof opt.shouldEcho == "undefined") opt.shouldEcho = true;

      opt.onData = opt.onData || function () {};

      opt.onStdErr = opt.onStdErr || function () {};

      opt.exitTrigger = opt.exitTrigger || "_AD.spawn.no.exit.trigger_";

      opt.textFilter = opt.textFilter || [];

      opt.log = opt.log || null;

      opt.shouldPipe = opt.shouldPipe || false;

      opt.spawnOpts = opt.spawnOpts || undefined;

      opt.outputOnStdErr = opt.outputOnStdErr || false;

      // display optional log
      if (opt.log) {
         console.log(opt.log);
      }

      // issue the command
      cmd = spawn(opt.command, opt.options, opt.spawnOpts);

      var codesToRemove = ["\\u001b", "[31m", "[39m"];
      function filterCodes(data) {
         codesToRemove.forEach(function (code) {
            data = stringReplaceAll(data, code, "");
         });
         return data;
      }
      //Listen for stdout messages
      cmd.stdout.on("data", function (data) {
         data = data.toString();

         // should we echo them?
         if (opt.shouldEcho) {
            // does data pass our text filters?
            if (!isFiltered(data, opt.textFilter)) {
               data = data.trim();

               // if this isn't one of our embedded questions
               if (data.indexOf("?  ") == -1) {
                  console.log(data.replace("\n", ""));
               } else {
                  // leave out the spacing
                  console.log(data);
               }
            }
         }

         // any responses to handle?
         if (opt.responses) {
            consoleResponse(cmd, data, opt.responses);
         }

         // call the onData fn();
         opt.onData(data);

         // Catch the final response text and then continue
         if (data.indexOf(opt.exitTrigger) != -1) {
            unpipeStdin(cmd, opt.shouldPipe);
            resolve(0);
         }
      });

      //Listen for stderr messages
      cmd.stderr.on("data", function (data) {
         data = data.toString().trim();

         if (!opt.outputOnStdErr) {
            opt.onStdErr(filterCodes(data));
         } else {
            opt.onData(filterCodes(data));
         }

         // any responses to handle?
         if (opt.responses) {
            consoleResponse(cmd, data, opt.responses);
         }

         if (opt.shouldEcho && data != "") {
            // does data pass our text filters?
            if (!isFiltered(data, opt.textFilter)) {
               console.log("stderr:[" + data + "]");
            }
         }

         // this was an error?
      });

      //Listen for error messages
      cmd.on("error", function (err) {
         console.error("err: " + err);
         unpipeStdin(cmd, opt.shouldPipe);
         reject(err);
      });

      //Listen for closing
      cmd.on("close", function (code) {
         //          console.log('child process exited with code ' + code);
         unpipeStdin(cmd);
         resolve(code);
      });

      // now tie in current stdin to our command:
      pipeStdin(cmd, opt.shouldPipe);
   });
};

/**
 * @function consoleResponse
 *
 * checks to see if provided data matches one of the expected responce tags
 * and returns the response.
 *
 *
 * @param {object} cmd  the spawn() object to write to.
 * @param {buffer} data the current data returned from the cmd process
 * @param {object} responses  the object hash representing the responses
 *                  the hash is in form:  'textMatch' : 'text to send'
 *                  ex:
 *                  var responses = {
 *                        'name:':'\n',
 *                        'entry point:': 'module.js\n',
 *                        'test command:': 'make test\n',
 *                        'keywords': '\n',
 *                        'license': '\n',
 *                        'Is this ok?': '\n'
 *                  };
 * @return {Deferred}
 */
function consoleResponse(cmd, data, responses) {
   var dataString = data.toString();

   // foreach possible response:
   for (var r in responses) {
      // if string trigger exists in data
      if (dataString.indexOf(r) != -1) {
         // write the response
         cmd.stdin.write(responses[r]);
      }
   }
}

/**
 * @function isFiltered
 *
 * returns true if the provided data contains one of the text filters
 * specified in filter array.
 *
 * Used by: utils.execCommand()
 *
 * @param {buffer} data the current data returned from the cmd process
 * @param {array}  filters  an array of strings
 * @return {bool}  true if data contains one of the filters, false otherwise
 */
function isFiltered(data, filters) {
   var str = data + "";
   var foundMatch = false;

   filters.forEach(function (filter) {
      if (str.indexOf(filter) != -1) {
         foundMatch = true;
      }
   });

   return foundMatch;
}

/**
 * @function pipeStdin
 *
 * connects the current process.stdin to the given spawn command.
 *
 * Used by: utils.execCommand()
 *
 * @param {object} cmd the current spawn command
 * @param {bool}   shouldPipe are pipes allowed right now?
 */
function pipeStdin(cmd, shouldPipe) {
   if (shouldPipe) {
      process.stdin.resume();
      process.stdin.setEncoding("utf8");
      process.stdin.pipe(cmd.stdin);
   }
}

/**
 * @function unpipeStdin
 *
 * unconnects the current process.stdin from the given spawn command.
 *
 * Used by: utils.execCommand()
 *
 * @param {object} cmd the current spawn command
 * @param {bool}   shouldPipe are pipes allowed right now?
 */
function unpipeStdin(cmd, shouldPipe) {
   if (shouldPipe) {
      process.stdin.unpipe(cmd.stdin);
      process.stdin.pause();
   }
}

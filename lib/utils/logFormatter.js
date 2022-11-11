const chalk = require("chalk");
const shell = require("shelljs");

/**
 * Logs text to the console using chalkjs formatting. Removes empty lines
 * @function log
 * @param {string} data text to log
 * @param {string} color chalkjs color
 * @param {string="    "} pad text to add to the left of each line
 */
function log(data, color = "white", pad = "    ") {
   const lines = data.split("\n");
   lines.forEach((l) => {
      if (!l) return;
      console.log(chalk[color](`${pad}${l}`));
   });
}
/**
 * Only formats text
 * @function format
 * @param {string} text content to be formatted
 * @param {object} options formatting options
 * @param {boolean} options.verbose with vrebose false ab empty string is returned
 * @param {string="white"} options.color color of the log (chalkjs color)
 * @param {string="    "} options.pad text to add to the let of the text
 * @returns {string}
 */
function format(text, { verbose, color, pad }) {
   return verbose ? chalk[color ?? "white"](`${pad ?? "    "}${text}`) : "";
}

/**
 * Run shelljs.exec with the stdout and stderr logged with a specefic format
 * @function exec
 * @param {string} command passed to shelljs.exec
 * @param {boolean} verbose without verbose only stderr is logged not stdout
 * @param {object} options
 * @param {object} options.exec any shelljs.exec options
 * @param {string="yellow"} options.errColor log color for stderr (chalkjs color)
 * @param {string="yellow"} options.outColor log color for stdout (chalkjs color)
 * @param {string="    "} options.pad text to add to the let of the text
 * @returns {Promise} resolves when the exec script finishes
 */
function exec(command, verbose, options = {}) {
   const execOptions = options.exec ?? { silent: true };
   return new Promise((resolve) => {
      const cmd = shell.exec(command, execOptions, resolve);
      cmd.stderr.on("data", (data) =>
         log(data, options.errColor ?? "yellow", options.pad)
      );
      if (verbose) {
         cmd.stdout.on("data", (data) =>
            log(data, options.outColor ?? "dim", options.pad)
         );
      }
   });
}

module.exports = { log, exec, format };

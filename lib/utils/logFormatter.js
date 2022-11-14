const chalk = require("chalk");
const shell = require("shelljs");
const cliProgress = require("cli-progress");

/**
 * Logs text to the console using chalkjs formatting. Removes empty lines
 * @function log
 * @param {string} data text to log
 * @param {string} color chalkjs color
 * @param {string="    "} pad text to add to the left of each line
 */
function log(data, color = "white", pad = "") {
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
         log(data, options.errColor ?? "yellow", options.pad ?? "    ")
      );
      if (verbose) {
         cmd.stdout.on("data", (data) =>
            log(data, options.outColor ?? "gray", options.pad ?? "    ")
         );
      }
   });
}

/**
 * generates a progressBar using cliProgress with common settings
 * @function progressBar
 * @param {string} prefix text to displat before the progress bar
 * @returns {object} instance of a cliProgress bar
 */
function progressBar(prefix = "") {
   const format = `${chalk.dim(prefix)}${chalk.cyan("{bar}")}${chalk.dim(
      " {percentage}% | {filename}"
   )}`;
   return new cliProgress.SingleBar({
      format,
      barCompleteChar: "\u2588",
      barIncompleteChar: "\u2591",
   });
}

/**
 * Trims or pads (right) a string so that it has a specefic length
 * @function adjustLength
 * @param {string} text
 * @param {number} length
 * @returns {string}
 */
function adjustLength(text, length) {
   const toFill = length - text.length;
   if (toFill == 0) return text;
   else if (toFill > 0) {
      const fill = new Array(toFill);
      fill.fill(" ");
      return `${text}${fill.join("")}`;
   } else {
      let characters = text.split("").slice(0, length);
      return characters.join("");
   }
}

/**
 * Generate text for a line of a given length by repeating a symbol.
 * @function line
 * @param {number} length of the line
 * @param {string} symbol
 * @returns {string}
 */
function line(length = 20, symbol = "\u2550") {
   const characters = new Array(length);
   characters.fill(symbol);
   return characters.join("");
}

module.exports = { log, exec, format, progressBar, line, adjustLength };

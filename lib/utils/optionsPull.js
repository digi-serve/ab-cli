/**
 * @function optionsPull
 * a generic routine to pull a subset of Options values and return them
 * @param {obj} options
 *              the original Options parameter
 * @param {string} index
 *              the parameter index that the subset will be keyed off of
 *              ex: "db" for Options.db.*  or Options.[db*] params.
 * @return {obj} hash of option values
 */
const path = require("path");
const unstringifyBools = require(path.join(__dirname, "unstringifyBools"));

var standardParams = ["travisCI", "develop"];
//  {array} Which Options.param should also be copied over into the result.

module.exports = function (Options, index) {
   var newOptions = {};

   // capture any existing .db values:
   if (Options[index]) {
      for (var b in Options[index]) {
         newOptions[b] = Options[index][b];
      }
   }

   // find any possible "dbParam" values
   for (var o in Options) {
      if (o.indexOf(index) == 0 && o.length > index.length) {
         var o2 = o.replace(index, "");
         var key = `${o2.charAt(0).toLowerCase() + o2.slice(1)}`;
         newOptions[key] = Options[o];
      }
   }

   standardParams.forEach((p) => {
      if (typeof Options[p] != "undefined") {
         newOptions[p] = Options[p];
      }
   });

   newOptions = unstringifyBools(newOptions);

   return newOptions;
};

/**
 * @function httpPost
 * perform a http POST operation.
 * @param {string} pathDir path to the directory
 * @param {string} urlProject  the git project https://url to add
 * @param {string} nameInstallDir the name of the local directory to create.
 * @param {fn} cb node style callback(err, result) when this is finished.
 */
var axios = require("axios");

const transport = axios.create({ withCredentials: true });

module.exports = function (url, data, options = {}) {
   var config = {
      url,
      method: "post",
      data,
   };

   var dontCopy = ["url", "method", "data"];
   Object.keys(options).forEach((k) => {
      if (dontCopy.indexOf(k) == -1) {
         config[k] = options[k];
      }
   });

   return transport(config);
};

//
// unstringifyBools
// changes "true" and "false" strings into actual boolean values throughout an array
//

/**
 * unstringifyBools
 * convert boolean inputs from strings into actual bools within a flat array
 * @param {array} inputArray  the array to process
 * @return {array}
 */

module.exports = function unstringifyBools(inputArray) {
   for (var i in inputArray) {
      if (inputArray[i] == "false") inputArray[i] = false;
      if (inputArray[i] == "true") inputArray[i] = true;
   }
   return inputArray;
};

//
// unstringifyBools
// changes "true" and "false" strings into actual boolean values throughout an object
//

/**
 * unstringifyBools
 * convert booleans from strings into actual bools within an object
 * @param {obj} input  the object to process
 * @return {obj}
 */

module.exports = function unstringifyBools(input) {
   for (var i in input) {
      if (typeof input[i] == "object") {
         unstringifyBools(input[i]);
      } else {
         if (input[i] === "false") input[i] = false;
         if (input[i] === "true") input[i] = true;
      }
   }
   return input;
};

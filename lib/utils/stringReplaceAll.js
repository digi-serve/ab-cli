/**
 * @function stringReplaceAll
 *
 * Replace all occurrences of replaceThis with withThis  inside the provided origString.
 *
 * NOTE: this returns a copy of the string.  origString is left as is.
 *
 * @codestart
 * var origString = 'Hello [name]. What is the Matrix, [name]?';
 * var replaceThis = '[name]';
 * withThis = 'Neo';
 *
 * var newString = utils.stringReplaceAll(origString, replaceThis, withThis);
 *
 * console.log(origString);  // Hello [name]. What is the Matrix, [name]?
 * console.log(newString);  // Hello Neo. What is the Matrix, Neo?
 * @codeend
 *
 * @param  {string} origString the string to check
 * @param {string} replaceThis  the string tag to replace
 * @param {string} withThis the string to insert in place of [replaceThis]
 * @return {bool}
 */
module.exports = function(origString, replaceThis, withThis) {
   var re = new RegExp(RegExpQuote(replaceThis), "g");
   return origString.replace(re, withThis);
};

/**
 * @function RegExpQuote
 *
 * Replace any special RegExp characters with '\'+char.
 *
 * @param  {string} origString the string to check
 * @return {bool}
 */
function RegExpQuote(str) {
   return str.replace(/([.?*+^$[\]\\(){}-])/g, "\\$1");
}

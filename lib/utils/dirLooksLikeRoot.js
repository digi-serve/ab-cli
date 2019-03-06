/**
 * @dirLooksLikeRoot
 *
 * returns true if current path looks like the ab_runtime directory.
 * returns false otherwise.
 *
 * @return {bool}  does the current directory look like our root.
 */

var path = require("path");

const dirLooksLike = require(path.join(__dirname, "dirLooksLike"));

module.exports = function(currPath) {
  currPath = currPath || process.cwd();

  return dirLooksLike(
    {
      assets: 1,
      config: 1,
      data: 1,
      nginx: 1,
      "source.docker-compose.yml": 1
    },
    currPath
  );
};

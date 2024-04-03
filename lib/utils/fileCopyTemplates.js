/**
 * fileCopyTemplates
 * Copy the templates associated with a command into the current directory.
 *
 * The Root ab-cli contains a templates/ directory.
 *
 * Directories inside this folder will be treated as copyable directories
 * that can be copied into a project.  Each directory should be named after
 * the command it is associated with.  So for the "setup" command, there
 * should be a "templates/setup/" directory.
 *
 * @param {string} templateDir
 *              the folder in the templates/. The file system at
 *              this path will be recreated in the current dir.
 * @param {obj} data
 *              the data to use in generating the template files.
 * @param {array} listCopies
 *              specify a list of files that should be copied and not
 *              rendered.
 *
 * @param {fn} cb node style callback when this is finished.
 */
var fs = require("fs");
var path = require("path");
var shell = require("shelljs");
const logFormatter = require("./logFormatter");

var fileRender = require(path.join(__dirname, "fileRender"));
var fileTemplatePath = require(path.join(__dirname, "fileTemplatePath"));
var stringRender = require(path.join(__dirname, "stringRender"));

module.exports = function (templateDir, data = {}, listCopies, cb) {
   // verify required params
   if (templateDir == "") {
      cb("template directory must be specified!");
      return;
   }

   var templatePath = path.join(fileTemplatePath(), templateDir);
   if (fs.existsSync(templatePath)) {
      try {
         recursiveScan(data, templatePath, "", listCopies, (msg) => {
            logFormatter.logVerbose(msg, undefined, "    ");
         });
         cb();
      } catch (e) {
         cb(e);
      }
   } else {
      cb(`template directory [${templatePath}] does not exist.`);
   }
}; // end module.exports = fn()

/**
 * recursiveScan
 * recursively process a templatePath and copy the files into the current
 * directory structure.
 */
var recursiveScan = function (
   data,
   templatePath,
   currPath = "",
   listCopies = [],
   log = console.log()
) {
   var skipFiles = [".DS_Store"];

   // get all files in the directory at path:
   var files = fs.readdirSync(path.resolve(templatePath, currPath));
   // util.debug("files found at:" + path.join(templatePath, currPath));
   // util.debug(files);
   for (var f in files) {
      var fileName = files[f];

      // if not one of our files to skip then
      if (skipFiles.indexOf(fileName) == -1) {
         var templateFilePath = path.join(currPath, fileName);

         // util.verbose("found: " + templateFilePath);

         var stats = fs.statSync(path.resolve(templatePath, templateFilePath));

         // find path to where new instance should be:
         var newFilePath = stringRender(path.resolve(currPath, fileName), data);
         var displayPath = newFilePath.replace(process.cwd(), "");

         if (stats.isDirectory()) {
            // util.verbose("   -> is a directory");

            // if dir ! exists
            if (!fs.existsSync(newFilePath)) {
               // create directory
               fs.mkdirSync(newFilePath);
               log("... created:" + displayPath);
            } else {
               log("... exists:" + displayPath);
            }

            recursiveScan(
               data,
               templatePath,
               path.join(currPath, fileName),
               listCopies,
               log
            );
         }

         if (stats.isFile()) {
            // util.verbose("   -> is a file");

            // if !file exists then
            if (!fs.existsSync(newFilePath)) {
               var contents;

               // if file is not a binary file (image type)
               if (!shouldCopyFile(newFilePath, listCopies)) {
                  // create file
                  try {
                     contents = fileRender(
                        path.join(templatePath, templateFilePath),
                        data
                     );

                     fs.writeFileSync(newFilePath, contents);
                     log("... created:" + displayPath);
                  } catch (e) {
                     log("Error: file:" + displayPath);
                     throw e;
                  }
               } else {
                  // copy file

                  contents = fs.readFileSync(
                     path.join(templatePath, templateFilePath)
                  );
                  fs.writeFileSync(newFilePath, contents);
                  log("... copied:" + displayPath);
               }

               var isExecutable = stats.mode & 0x111;
               if (isExecutable && newFilePath.indexOf(".sh") > -1) {
                  log("    ---> executable. (" + stats.mode.toString(8) + ")");
                  shell.chmod("+x", newFilePath);
               }
            } else {
               log("... exists:" + displayPath);
            }
         }
      } // if !skipFile
   }
};

function shouldCopyFile(name, listCopies) {
   listCopies = listCopies || [];

   // files that are images, or canjs/...  should be copied.
   var fileTypes = {
      // images:
      ".jpg": "jpeg",
      ".png": "png",
      ".gif": "gif",

      // binary files
      ".gz": "gzip",
      ".tar": "tar",

      // packaged libraries:  CanJS & Bootstrap
      canjs: "canjs",
      bootstrap: "bootstrap",
   };

   var isBinary = false;
   for (var f in fileTypes) {
      if (name.indexOf(f) != -1) {
         isBinary = true;
      }
   }

   var isInListCopy = false;
   if (!isBinary) {
      listCopies.forEach((path) => {
         if (name.indexOf(path) != -1) {
            isInListCopy = true;
         }
      });
   }
   return isBinary || isInListCopy;
}

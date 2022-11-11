/**
 * filePatch
 * modify a file(s).
 * @param {array} set an array of patch definitions to execute.
 *                each entry should have either:
 *                  .file {string} path to the file to modify
 *                  .tag  {string|regex} to identify what to modify
 *                  .replace {string} to data to replace .tag with
 *                OR
 *                  .file
 *                  .tag
 *                  .template {string} path to a template for the data to replace .tag with
 *                  .data {obj} key=>value hash of variables in the template
 *                optional params:
 *                  .log {string} print out this message after patch made
 *
 * @param {fn} done  node style callback when this is finished.
 */
var async = require("async");
var fs = require("fs");
var path = require("path");

var fileRender = require(path.join(__dirname, "fileRender"));
var fileTemplatePath = require(path.join(__dirname, "fileTemplatePath"));

module.exports = function (set, cb) {
   set = set || [];
   cb = cb || function () {}; // (err)=>{};

   //    var templatePath = path.resolve(__dirname, '../../templates' );
   var templatePath = fileTemplatePath();

   // can call this 2 ways:

   // with data embedded in the patch object:
   //    [ {
   //     file: path.join('assets', 'opstools', 'config', 'opsportal.js'),
   //     tag: /areas.*\[/,
   //     replace: [
   //         "areas: [",
   //         "",
   //         "",
   //         "    ////",
   //         "    //// New OpsTool: "+OpsToolName,
   //         "    ////",
   //         "    {",
   //         "        // Define the Area for "+OpsToolName,
   //         "        icon:'fa-cogs',",
   //         "        key:'"+OpsToolName+"',",
   //         "        label:'"+OpsToolName+"',",
   //         "        tools:[{",
   //         "            // "+OpsToolName+" Tool",
   //         "            controller:'"+OpsToolName+"',",
   //         "            label:'"+OpsToolName+"',",
   //         "            isDefault: true,",
   //         "            permissions:[",
   //         "                'adcore.admin'",
   //         "                , 'adcore.developer'",
   //         "            ]",
   //         "          }",
   //         "        ]",
   //         "    },"
   //     ].join('\n')
   // }];

   // with patch object pointing to a template file to render:
   //    [ {  file:'config/local.js', tag:"});", template:'templates/__config_db.ejs', data:data }];

   async.eachSeries(
      set,
      (curr, done) => {
         var patchData = "";

         // if a template was provided
         if (curr.template) {
            patchData = fileRender(
               path.join(templatePath, curr.template),
               curr.data
            );
         } else {
            // else use the given replace string
            patchData = curr.replace;
         }

         try {
            fs.accessSync(curr.file, fs.constants.R_OK | fs.constants.W_OK);
            var contents = fs.readFileSync(curr.file, "utf8");

            // note:  make sure patchData properly replaces curr.tag
            contents = contents.replace(curr.tag, patchData);

            fs.writeFileSync(curr.file, contents);
            if (curr.log) {
               // does not inclue curr.log == ""
               console.log(curr.log);
               // if they left .log == "" then don't print anything.
            } else if (curr.log != "") {
               console.log(`patched: ${curr.file} `);
            }
            done();
         } catch (err) {
            console.log(
               `warning: file (${curr.file}) not accessable. (${err})`
            );
            done(err);
         }
         // fs.access(curr.file, (err) => {
         //     if (err) {
         //         console.log(
         //             `warning: file (${curr.file}) not accessable. (${err})`
         //         );
         //     } else {
         //         var contents = fs.readFileSync(curr.file, "utf8");

         //         // note:  make sure patchData properly replaces curr.tag
         //         contents = contents.replace(curr.tag, patchData);

         //         fs.writeFileSync(curr.file, contents);
         //         if (curr.log) {
         //             // if they left .log == "" then don't print anything.
         //             if (curr.log.length > 0) {
         //                 console.log(curr.log);
         //             }
         //         } else {
         //             console.log(`patched: ${curr.file} `);
         //         }
         //     }
         //     done();
         // });
      },
      (err) => {
         cb(err);
      }
   );
}; // end module.exports = fn()

/**
 * utils.writeEnvironment()
 * Write variables to the .env file
 */
const envfile = require("envfile");
const fs = require("fs");
const path = require("path");

/**
 * Write variables to the .env file
 * @param {object} values each key will become a env variable with its value
 */
module.exports = (values) => {
   const envPath = path.join(process.cwd(), ".env");
   let environment = {};
   try {
      environment = envfile.parse(fs.readFileSync(envPath));
   } catch (e) {
      // We expect an error the first time since the file isn't created yet.
      if (!e.message.includes("no such file or directory")) console.error(e);
   }
   for (let key in values) {
      environment[key] = values[key];
   }
   fs.writeFileSync(envPath, envfile.stringify(environment));
   return;
};

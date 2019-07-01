/**
 * <%= service %>/<%= action %>.js
 *
 *
 * url:     <%= verb %> <%= route %>
 * header:  X-CSRF-Token : [token]
 * params:
 */
const cote = require("cote");
const client = new cote.Requester({
    name: "api_sails > <%= service %> > <%= action %>"
});
const shortid = require("shortid");

// make sure our BasePath is created:
module.exports = function(req, res) {
    // Package the Find Request and pass it off to the service

    var jobID = shortid.generate();

    console.log(`<%= service %>::<%= action %>::${jobID}`);

    // create a new job for the file_processor
    let jobData = {
        jobID: jobID
    };

    // pass the request off to the uService:
    client.send({ type: "<%= key %>", param: jobData }, (err, results) => {
        if (err) {
            res.json({ status: "error", error: err });
            return;
        }
        res.json({ status: "success", data: results });
    });
};

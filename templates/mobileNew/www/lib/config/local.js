/*
 * local.js
 * provide any overrides to the standard configs here.
 * and don't check this file into any git repository.
 */
module.exports = {
    codepush: {
        keys: {
            ios: "AJ8RccrSQf6oj4XaMHfrpWyjlUM1S1pZFvRDX",
            android: "hE6WZjULeo0q2iZb7G5MHV6CbK-3SkjTMWLdX"
        }
    },
    countly: {
        url: "<%= countlyURL %>",
        appKey: "<%= countlyAppKey %>"
    },
    onesignal: {
        appID: "f10695bb-52e4-4b78-a629-2dcbd92fc14e"
    },
    sentryio: {
        dsn: "<%= sentryDSN %>"
    }
};

/*
 * local.js
 * provide any overrides to the standard configs here.
 * and don't check this file into any git repository.
 */
module.exports = {
    appbuilder: {
        maID: "<%= appID %>",
        networkType: "<%= networkType %>",
        urlCoreServer: "<%= networkCoreURL %>",
        urlRelayServer: "<%= networkRelayURL %>"
    },
    codepush: {
        keys: {
            ios: "<%= codepushKeyIOS %>",
            android: "<%= codepushKeyAndroid %>"
        }
    },
    countly: {
        url: "<%= countlyURL %>",
        appKey: "<%= countlyAppKey %>"
    },
    onesignal: {
        appID: "<%= onesignalAppID %>"
    },
    platform: {
        encryptedStorage: true,
        passwordProtected: true
    },
    sentryio: {
        dsn: "<%= sentryDSN %>"
    }
};

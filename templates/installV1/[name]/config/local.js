module.exports = {
    environment: process.env.NODE_ENV || "development",
    connections: {
        appdev_default: {
            host: "db",
            port: 3306,
            user: "root",
            password: "<%=dbPassword%>",
            database: "site"
        },
        appBuilder: {
            adapter: null,
            host: null,
            user: null,
            password: null,
            database: "appbuilder"
        }
    },
    appbuilder: {
        baseURL: "http://localhost:1337",
        deeplink: null,
        mcc: {
            enabled: false,
            url: "http://localhost:1337",
            accessToken: "There is no spoon.",
            pollFrequency: 5000,
            maxPacketSize: 1048576
        },
        pathFiles: "data/app_builder",
        graphDB: {
            url: "http://arangodb:8529",
            user: "root",
            pass: "<%=arangoPassword%>"
        }
    },
    nodemailer: {
        default: "smtp",
        smtp: {
            type: "SMTP",
            host: "SMTP.HOST.ADDR",
            secureConnection: false,
            port: 25
        }
    },
    crontab: {}
};

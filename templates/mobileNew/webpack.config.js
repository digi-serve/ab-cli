var path = require("path");
module.exports = {
    entry: {
        "<%= appName %>": "./www/lib/index.js",
        "pbkdf2-worker-bundle": "./www/lib/resources/PBKDF2-worker.js"
    },
    devtool: "source-map",
    output: {
        filename: "[name].js",
        sourceMapFilename: "[name].js.map",
        path: path.resolve(__dirname, "www", "js")
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                //exclude: /(node_modules|bower_components)/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: ["@babel/preset-env"]
                    }
                }
            }
        ]
    }
};

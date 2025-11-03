const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const ExtensionReloader = require("./scripts/ext-reloader");
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const isDev = process.env.NODE_ENV === "development";
const plugins = [];

if (isDev) {
  plugins.push(new ExtensionReloader());
} else {
  plugins.push(new CleanWebpackPlugin());
}

plugins.push(
  new CopyWebpackPlugin({
    patterns: [
      {
        from: "./public",
        to: "./"
      }
    ]
  })
);

module.exports = {
  mode: isDev ? "development" : "production",
  devtool: isDev ? "cheap-module-source-map" : false,
  entry: {
    background: "./src/background.ts",
    content: "./src/content.ts",
    popup: "./src/popup.ts"
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js"
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"]
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/
      }
    ]
  },
  plugins: plugins,
  performance: {
    hints: false
  }
};

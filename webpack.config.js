const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const ExtensionReloader = require("./scripts/ext-reloader");
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

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
  }),
  new MiniCssExtractPlugin({
    filename: '[name].css',
  })
);

module.exports = {
  mode: isDev ? "development" : "production",
  devtool: isDev ? "cheap-module-source-map" : false,
  entry: {
    background: "./src/background.ts",
    content: "./src/content.ts",
    bootstrap: [
      "bootstrap/dist/css/bootstrap.min.css",
      "bootstrap/dist/js/bootstrap.bundle.min.js",
    ],
    "bootstrap-icons": "bootstrap-icons/font/bootstrap-icons.min.css",
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
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
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

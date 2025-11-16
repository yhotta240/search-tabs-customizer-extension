const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const ExtensionReloader = require("./scripts/ext-reloader");
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const isDev = process.env.NODE_ENV === "development";

module.exports = {
  mode: isDev ? "development" : "production",
  devtool: isDev ? "inline-source-map" : false,
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
  plugins: (() => {
    const plugins = [
      new CopyWebpackPlugin({
        patterns: [
          {
            from: "./public",
            to: "./",
            transform(content, absoluteFrom) {
              // manifest.jsonの場合、tabs権限を削除
              if (absoluteFrom.endsWith('manifest.json')) {
                const manifest = JSON.parse(content.toString());
                if (manifest.permissions) {
                  manifest.permissions = manifest.permissions.filter(p => p !== 'tabs');
                }
                return JSON.stringify(manifest, null, 2);
              }
              return content;
            }
          }
        ]
      })
    ];
    if (isDev) {
      plugins.push(new ExtensionReloader());
    } else {
      plugins.push(new CleanWebpackPlugin());
    }
    plugins.push(new MiniCssExtractPlugin({
      filename: '[name].css',
    }));
    return plugins;
  })(),
  performance: {
    hints: false
  }
};

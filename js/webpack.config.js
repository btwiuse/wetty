// https://stackoverflow.com/questions/43870615/minification-for-es6-code-in-webpack-using-babel
// https://github.com/verlok/lazyload/issues/259
// const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const MinifyPlugin = require("babel-minify-webpack-plugin");

module.exports = {
  entry: "./src/main.ts",
  output: {
    filename: "./wetty-bundle.js",
  },
  devtool: "source-map",
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.js$/,
        include: /node_modules/,
        loader: "license-loader",
      },
    ],
  },
  plugins: [
    // new MinifyPlugin()
  ],
};

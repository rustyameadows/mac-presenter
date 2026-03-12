const path = require("node:path");

const HtmlWebpackPlugin = require("html-webpack-plugin");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");

module.exports = {
  mode: process.env.NODE_ENV === "production" ? "production" : "development",
  devtool: "source-map",
  target: "web",
  entry: "./src/renderer/index.tsx",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: "ts-loader",
          options: {
            transpileOnly: true
          }
        }
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"]
      }
    ]
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
    alias: {
      "@presenter/core/node": path.resolve(__dirname, "../../packages/core/src/node.ts"),
      "@presenter/core$": path.resolve(__dirname, "../../packages/core/src/browser.ts")
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/renderer/index.html"
    }),
    new ForkTsCheckerWebpackPlugin()
  ],
  output: {
    path: path.resolve(__dirname, ".webpack/renderer"),
    filename: "renderer.js"
  }
};

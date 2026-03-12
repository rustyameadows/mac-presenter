const path = require("node:path");

const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");

module.exports = {
  mode: process.env.NODE_ENV === "production" ? "production" : "development",
  devtool: "source-map",
  target: "electron-main",
  entry: "./src/main/main.ts",
  module: {
    rules: [
      {
        test: /native_modules\/.+\.node$/,
        use: "node-loader"
      },
      {
        test: /\.(m?js|node)$/,
        parser: { amd: false },
        use: {
          loader: "@vercel/webpack-asset-relocator-loader",
          options: {
            outputAssetBase: "native_modules"
          }
        }
      },
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: "ts-loader",
          options: {
            transpileOnly: true
          }
        }
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
  plugins: [new ForkTsCheckerWebpackPlugin()],
  output: {
    path: path.resolve(__dirname, ".webpack/main"),
    filename: "index.js"
  }
};

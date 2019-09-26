const BabelRcPlugin = require("@jackwilsdon/craco-use-babelrc");
const BabelLoader = require("craco-babel-loader");
const WorkerLoaderPlugin = require("./craco/worker-loader");

module.exports = function({ env }) {
  return {
    plugins: [
      {
        plugin: BabelRcPlugin
      },
      {
        plugin: WorkerLoaderPlugin
      }
    ],
    webpack: {
      configure: {
        output: {
          globalObject: "this"
        }
      }
    }
  };
};

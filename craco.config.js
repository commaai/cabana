const BabelRcPlugin = require("@jackwilsdon/craco-use-babelrc");
const BabelLoader = require("craco-babel-loader");
const { loaderByName, addBeforeLoader } = require("@craco/craco");

module.exports = function({ env }) {
  return {
    plugins: [
      {
        plugin: BabelRcPlugin
      },
      {
        plugin: {
          overrideWebpackConfig: ({ webpackConfig, context: { env } }) => {
            const workerLoader = {
              test: /\.worker\.js/,
              use: [
                {
                  loader: "worker-loader",
                  options: {
                    inline: true,
                    fallback: false
                  }
                }
              ]
            };
            addBeforeLoader(
              webpackConfig,
              loaderByName("babel-loader"),
              workerLoader
            );
            return webpackConfig;
          }
        }
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

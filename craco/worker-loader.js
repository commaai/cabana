const { loaderByName, addBeforeLoader } = require("@craco/craco");

module.exports = {
  overrideWebpackConfig: ({ webpackConfig, context: { env } }) => {
    const workerLoader = {
      test: /\.worker\.js/,
      use: {
        loader: "worker-loader"
      }
    };
    addBeforeLoader(webpackConfig, loaderByName("babel-loader"), workerLoader);
    return webpackConfig;
  }
};

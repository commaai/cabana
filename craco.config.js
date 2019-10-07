const WorkerLoaderPlugin = require('craco-worker-loader');
const SentryPlugin = require('craco-sentry-plugin');

module.exports = function ({ env }) {
  const plugins = [
    {
      plugin: WorkerLoaderPlugin
    }
  ];
  if (env === 'production') {
    // plugins.push({
    //   plugin: SentryPlugin
    // });
  }
  return {
    plugins,
    webpack: {
      configure: (webpackConfig, { env, paths }) => {
        webpackConfig.output.globalObject = 'this';
        webpackConfig.optimization.minimizer = webpackConfig.optimization.minimizer.map(
          (plugin) => {
            if (plugin.constructor.name !== 'TerserPlugin') {
              return plugin;
            }
            plugin.options.terserOptions.keep_fnames = true;
            return plugin;
          }
        );
        return webpackConfig;
      }
    }
  };
};

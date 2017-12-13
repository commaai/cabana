const path = require("path");

module.exports = function override(config, env) {
  config.module.rules.push({
    test: /worker\.js$/,
    include: path.resolve("./src"),
    use: [{ loader: "worker-loader" }, { loader: "babel-loader" }]
  });

  return config;
};

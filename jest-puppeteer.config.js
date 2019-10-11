module.exports = {
  server: {
    command: 'PORT=3002 env-cmd .env.staging craco start',
    port: 3002,
    launchTimeout: 10000,
    debug: true,
  },
};

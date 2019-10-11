const { createJestConfig } = require('@craco/craco');
const cracoConfig = require('../../craco.config.js');

const jestConfig = createJestConfig(cracoConfig);

module.exports = {
  ...jestConfig,
  preset: 'jest-puppeteer',
  testMatch: ['<rootDir>/src/**/__puppeteer__/**/*.test.{js,jsx,ts,tsx}'],
  setupFilesAfterEnv: [...jestConfig.setupFilesAfterEnv, 'expect-puppeteer'],
  testPathIgnorePatterns: ['node_modules']
};

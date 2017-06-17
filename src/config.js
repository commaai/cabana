const ENV = 'debug'; // todo dynamic
const ENV_GITHUB_CLIENT_ID = {debug: '4b43250e7499a97d62a5',
                              prod: ''}
export const GITHUB_CLIENT_ID = ENV_GITHUB_CLIENT_ID[ENV];

const ENV_GITHUB_REDIRECT_URL = {debug: 'http://127.0.0.1:1235/callback',
                                 prod: ''}
export const GITHUB_REDIRECT_URL = ENV_GITHUB_REDIRECT_URL[ENV];

export const OPENDBC_SOURCE_REPO = 'commaai/opendbc';
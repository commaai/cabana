import {getUrlParameter} from './utils/url';

const ENV = process.env.NODE_ENV === 'production' ? 'prod' : 'debug';

const ENV_GITHUB_CLIENT_ID = {debug: '4b43250e7499a97d62a5',
                              prod: ''}
export const GITHUB_CLIENT_ID = ENV_GITHUB_CLIENT_ID[ENV];

const ENV_GITHUB_REDIRECT_URL = {debug: 'http://127.0.0.1:1235/callback',
                                 prod: 'https://api.comma.ai/cabana/ghcallback'}
export const GITHUB_REDIRECT_URL = ENV_GITHUB_REDIRECT_URL[ENV];
export const GITHUB_AUTH_TOKEN_KEY = 'gh_access_token';
export const OPENDBC_SOURCE_REPO = 'commaai/opendbc';

export const USE_UNLOGGER = (getUrlParameter('unlogger') !== null);
export const UNLOGGER_HOST = 'http://localhost:8080/unlogger';
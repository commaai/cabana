import {GITHUB_CLIENT_ID, GITHUB_REDIRECT_URL} from '../config';
import {objToQuery, getUrlParameter} from '../utils/url';

function toHex(dec) {
  return ('0' + dec.toString(16)).substr(-2);
}

function generateState() {
  // returns pseudorandom 16 character string
  // has system level entropy on most systems thru window.crypto

  var arr = new Uint8Array(8);
  window.crypto.getRandomValues(arr);
  return Array.from(arr, toHex).join('');
}

export function hasValidAccessToken() {
  return getUrlParameter('gh_access_token').length > 0;
}

export function authorizeUrl() {
  const params = {client_id: GITHUB_CLIENT_ID,
                  redirect_uri: GITHUB_REDIRECT_URL,
                  scope: 'user:email public_repo',
                  state: generateState()};

  return `http://github.com/login/oauth/authorize?${objToQuery(params)}`;
}

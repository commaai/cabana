import Cookies from 'js-cookie';

import {COMMA_ACCESS_TOKEN_COOKIE, COMMA_OAUTH_REDIRECT_COOKIE} from '../config';

function getCommaAccessToken() {
    return Cookies.get(COMMA_ACCESS_TOKEN_COOKIE);
}

function isAuthenticated() {
    return getCommaAccessToken() !== undefined;
}

function authUrl() {
    Cookies.set(COMMA_OAUTH_REDIRECT_COOKIE, window.location.href);

    return 'https://community.comma.ai/ucp.php?mode=login&login=external&oauth_service=google';
}

export default {getCommaAccessToken, isAuthenticated, authUrl};

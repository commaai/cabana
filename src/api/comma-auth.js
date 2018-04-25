import Cookies from "js-cookie";
import storage from "localforage";

import {
  COMMA_ACCESS_TOKEN_COOKIE,
  COMMA_OAUTH_REDIRECT_COOKIE
} from "../config";

let isAuthed = false;

export async function getCommaAccessToken() {
  let token = getTokenInternal();
  if (!token) {
    token = await storage.getItem("authorization");
  }

  if (token) {
    isAuthed = true;
    await storage.setItem("authorization", token);
  }

  return token;
}

// seed cache
getCommaAccessToken();

function getTokenInternal() {
  if (typeof localStorage !== "undefined") {
    if (localStorage.authorization) {
      return localStorage.authorization;
    }
  }
  return Cookies.get(COMMA_ACCESS_TOKEN_COOKIE);
}

export function isAuthenticated() {
  return isAuthed;
}

export function authUrl() {
  Cookies.set(COMMA_OAUTH_REDIRECT_COOKIE, window.location.href);

  return "https://community.comma.ai/ucp.php?mode=login&login=external&oauth_service=google";
}

import DBC from "../models/can/dbc";

export function fetchPersistedDbc(routeName) {
  const maybeDbc = window.localStorage.getItem(routeName);
  if (maybeDbc !== null) {
    const { dbcFilename, dbcText } = JSON.parse(maybeDbc);
    const dbc = new DBC(dbcText);

    return { dbc, dbcText, dbcFilename };
  } else return null;
}

export function persistDbc(routeName, { dbcFilename, dbc }) {
  const dbcJson = JSON.stringify({
    dbcFilename,
    dbcText: dbc.text()
  });
  window.localStorage.setItem(routeName, dbcJson);
}

const GITHUB_AUTH_TOKEN_LOCALSTORAGE_KEY = "gh_auth_token";
export function fetchPersistedGithubAuthToken() {
  return window.localStorage.getItem(GITHUB_AUTH_TOKEN_LOCALSTORAGE_KEY);
}

export function unpersistGithubAuthToken() {
  window.localStorage.removeItem(GITHUB_AUTH_TOKEN_LOCALSTORAGE_KEY);
}

export function persistGithubAuthToken(token) {
  return window.localStorage.setItem(GITHUB_AUTH_TOKEN_LOCALSTORAGE_KEY, token);
}

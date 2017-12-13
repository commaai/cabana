import { GITHUB_CLIENT_ID, GITHUB_REDIRECT_URL } from "../config";
import { objToQuery } from "../utils/url";

export function authorizeUrl(route) {
  const params = {
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: GITHUB_REDIRECT_URL,
    scope: "user:email public_repo",
    state: JSON.stringify({ route })
  };

  return `http://github.com/login/oauth/authorize?${objToQuery(params)}`;
}

import Sentry from "./logging/Sentry";
import React from "react";
import ReactDOM from "react-dom";
import CommaAuth from "@commaai/my-comma-auth";
import { request as Request } from "@commaai/comma-api";
import CanExplorer from "./CanExplorer";
import AcuraDbc from "./acura-dbc";
import { getUrlParameter, modifyQueryParameters } from "./utils/url";
import { GITHUB_AUTH_TOKEN_KEY } from "./config";
import {
  fetchPersistedDbc,
  fetchPersistedGithubAuthToken,
  persistGithubAuthToken
} from "./api/localstorage";
import "./index.css";

Sentry.init();

const routeFullName = getUrlParameter("route");
let isDemo = !routeFullName;
let props = { autoplay: true, isDemo };
let persistedDbc = null;

if (routeFullName) {
  const [dongleId, route] = routeFullName.split("|");
  props.dongleId = dongleId;
  props.name = route;

  persistedDbc = fetchPersistedDbc(routeFullName);

  let max = getUrlParameter("max"),
    url = getUrlParameter("url"),
    exp = getUrlParameter("exp"),
    sig = getUrlParameter("sig");

  if (max) {
    props.max = max;
  }
  if (url) {
    props.url = url;
  }
  if (exp) {
    props.exp = exp;
  }
  if (sig) {
    props.sig = sig;
  }
  props.isLegacyShare = max && url && !exp && !sig;
  props.isShare = max && url && exp && sig;
} else if (getUrlParameter("demo")) {
  props.max = 12;
  props.url =
    "https://chffrprivate.blob.core.windows.net/chffrprivate3-permanent/v2/cb38263377b873ee/78392b99580c5920227cc5b43dff8a70_2017-06-12--18-51-47";
  props.name = "2017-06-12--18-51-47";
  props.dongleId = "cb38263377b873ee";
  props.dbc = AcuraDbc;
  props.isDemo = true;
  props.dbcFilename = "acura_ilx_2016_can.dbc";

  // lots of 404s on this one
  // props.max = 752;
  // props.url = 'https://chffrprivate.blob.core.windows.net/chffrprivate3/v2/07e243287e48432a/d97fcc321a58e660a14de72b749269ba_2017-09-09--22-00-00';
  // props.name = '2017-09-09--22-00-00';
  // props.dongleId = '07e243287e48432a';
  // props.dbc = AcuraDbc;
  // props.dbcFilename = 'acura_ilx_2016_can.dbc';

  // really long one with real content
  // props.max = 597;
  // props.url = 'https://chffrprivate.blob.core.windows.net/chffrprivate3/v2/0c249898b339e978/957935e6a75bc2bf6f626fcbe6db93ba_2017-08-11--04-47-54';
  // props.name = '2017-08-11--04-47-54';
  // props.dongleId = '0c249898b339e978';
  // props.dbc = AcuraDbc;
  // props.dbcFilename = 'acura_ilx_2016_can.dbc';
}

if (persistedDbc) {
  const { dbcFilename, dbc } = persistedDbc;
  props.dbc = dbc;
  props.dbcFilename = dbcFilename;
}

const authTokenQueryParam = getUrlParameter(GITHUB_AUTH_TOKEN_KEY);
if (authTokenQueryParam !== null) {
  props.githubAuthToken = authTokenQueryParam;
  persistGithubAuthToken(authTokenQueryParam);
  const urlNoAuthToken = modifyQueryParameters({
    remove: [GITHUB_AUTH_TOKEN_KEY]
  });
  window.location.href = urlNoAuthToken;
} else {
  props.githubAuthToken = fetchPersistedGithubAuthToken();
}

async function init() {
  const token = await CommaAuth.init();
  if (token) {
    Request.configure(token);
  }
  ReactDOM.render(<CanExplorer {...props} />, document.getElementById("root"));
}

if (routeFullName || isDemo) {
  init();
} else {
  const img = document.createElement("img");
  img.src = process.env.PUBLIC_URL + "/img/cabana.jpg";
  img.style.width = "100%";
  const comment = document.createComment("7/6/17");

  document.getElementById("root").appendChild(img);
  document.getElementById("root").appendChild(comment);
}

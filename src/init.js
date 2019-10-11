import React from 'react';
import ReactDOM from 'react-dom';
import CommaAuth from '@commaai/my-comma-auth';
import { request as Request } from '@commaai/comma-api';
import Sentry from './logging/Sentry';
import CanExplorer from './CanExplorer';
import AcuraDbc from './acura-dbc';
import { getUrlParameter, modifyQueryParameters } from './utils/url';
import { GITHUB_AUTH_TOKEN_KEY } from './config';
import {
  fetchPersistedDbc,
  fetchPersistedGithubAuthToken,
  persistGithubAuthToken
} from './api/localstorage';
import { demoProps } from './demo';

export default function init() {
  Sentry.init();

  const routeFullName = getUrlParameter('route');
  const isDemo = !routeFullName;
  let segments = getUrlParameter('segments');
  if (segments && segments.length) {
    segments = segments.split(',').map(Number);

    if (segments.length !== 2) {
      segments = undefined;
    }
  }

  let props = {
    autoplay: true,
    startTime: Number(getUrlParameter('seekTime') || 0),
    segments,
    isDemo
  };
  let persistedDbc = null;

  if (routeFullName) {
    const [dongleId, route] = routeFullName.split('|');
    props.dongleId = dongleId;
    props.name = route;

    persistedDbc = fetchPersistedDbc(routeFullName);

    const max = getUrlParameter('max');
    const url = getUrlParameter('url');
    const exp = getUrlParameter('exp');
    const sig = getUrlParameter('sig');

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
  } else if (getUrlParameter('demo')) {
    props = { ...props, ...demoProps };
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

  async function renderDom() {
    const token = await CommaAuth.init();
    if (token) {
      Request.configure(token);
    }
    ReactDOM.render(<CanExplorer {...props} />, document.getElementById('root')); // eslint-disable-line react/jsx-props-no-spreading
  }

  if (routeFullName || isDemo) {
    renderDom();
    return;
  }

  const img = document.createElement('img');
  img.src = `${process.env.PUBLIC_URL}/img/cabana.jpg`;
  img.style.width = '100%';
  const comment = document.createComment('7/6/17');

  document.getElementById('root').appendChild(img);
  document.getElementById('root').appendChild(comment);
}

import React from 'react';
import ReactDOM from 'react-dom';
import qs from 'query-string';
import CommaAuth, { config as AuthConfig, storage as AuthStorage } from '@commaai/my-comma-auth';
import { auth as AuthApi, request as Request } from '@commaai/comma-api';
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

async function authenticate() {
  if (window.location && window.location.pathname === AuthConfig.AUTH_PATH) {
    try {
      const { code, provider } = qs.parse(window.location.search);
      const token = await AuthApi.refreshAccessToken(code, provider);
      if (token) {
        AuthStorage.setCommaAccessToken(token);

        // reset stored path
        if (window.sessionStorage) {
          const onboardingPath = window.sessionStorage.getItem('onboardingPath');
          if (onboardingPath) {
            window.sessionStorage.removeItem('onboardingPath');
            window.location = onboardingPath;
          }
        }
      }
    } catch (err) {
      console.log(err);
    }
  }

  const token = await CommaAuth.init();
  if (token) {
    Request.configure(token);
  }
}

export default function init() {
  Sentry.init();

  const routeFullName = getUrlParameter('route');
  const isDemo = !!getUrlParameter('demo');
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
  } else if (isDemo) {
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
    ReactDOM.render(<CanExplorer {...props} />, document.getElementById('root')); // eslint-disable-line react/jsx-props-no-spreading
  }

  authenticate().then(() => {
    renderDom();
  });
}

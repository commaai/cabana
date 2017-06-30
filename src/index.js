import Sentry from './logging/Sentry';

import React from 'react';
import ReactDOM from 'react-dom';
import CanExplorer from './CanExplorer';
import AcuraDbc from './acura-dbc';
import {getUrlParameter} from './utils/url';
import {GITHUB_AUTH_TOKEN_KEY} from './config';
import {fetchPersistedDbc,
        fetchPersistedGithubAuthToken,
        persistGithubAuthToken} from './api/localstorage';
require('core-js/fn/object/entries');
require('core-js/fn/object/values');
import './index.css';

const routeFullName = getUrlParameter('route');
let props = {};
if(routeFullName) {
    const [dongleId, route] = routeFullName.split('|');
    props.dongleId = dongleId;
    props.name = route;

    const persistedDbc = fetchPersistedDbc(routeFullName);
    if(persistedDbc) {
      const {dbcFilename, dbc} = persistedDbc;
      props.dbc = dbc;
      props.dbcFilename = dbcFilename;
    }
} else {
    props.dongleId = 'cb38263377b873ee';
    props.name = '2017-06-12--18-51-47';
    props.dbc = AcuraDbc;
    props.dbcFilename = 'acura_ilx_2016_can.dbc';
}

const authTokenQueryParam = getUrlParameter(GITHUB_AUTH_TOKEN_KEY);
if(authTokenQueryParam !== null) {
  props.githubAuthToken = authTokenQueryParam;
  persistGithubAuthToken(authTokenQueryParam);
} else {
  props.githubAuthToken = fetchPersistedGithubAuthToken();
}

ReactDOM.render(
  <CanExplorer
     {...props} />,
  document.getElementById('root')
);

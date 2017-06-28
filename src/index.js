import Raven from 'raven-js';
const opts = {};
console.log(window.__webpack_hash__)
if(window.__webpack_hash__ !== undefined) {
    opts['release'] = window.__webpack_hash__;
}

Raven
    .config('https://50006e5d91894f508dd288bbbf4585a6@sentry.io/185303', opts)
    .install();

import React from 'react';
import ReactDOM from 'react-dom';
import CanExplorer from './CanExplorer';
import AcuraDbc from './acura-dbc';
import {getUrlParameter} from './utils/url';

import './index.css';

const routeFullName = getUrlParameter('route');
let props = {};
if(routeFullName) {
    const [dongleId, route] = routeFullName.split('|');
    props.dongleId = dongleId;
    props.name = route;
} else {
    props.dongleId = '3a874b7845c28583';
    props.name = '2017-06-09--18-23-30';
}
ReactDOM.render(
  <CanExplorer
     {...props} />,
  document.getElementById('root')
);

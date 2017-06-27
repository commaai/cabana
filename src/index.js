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

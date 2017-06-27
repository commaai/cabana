import React from 'react';
import ReactDOM from 'react-dom';
import CanExplorer from './CanExplorer';
import AcuraDbc from './acura-dbc';
import {getUrlParameter} from './utils/url';

import './index.css';

ReactDOM.render(
  <CanExplorer
     dongleId={getUrlParameter('route') ? undefined : "3a874b7845c28583"}
     name={getUrlParameter('route') || "2017-06-09--18-23-30"} />,
  document.getElementById('root')
);

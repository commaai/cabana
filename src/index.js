import React from 'react';
import ReactDOM from 'react-dom';
import CanExplorer from './CanExplorer';
import AcuraDbc from './acura-dbc';

import './index.css';

ReactDOM.render(
  <CanExplorer
     dongleId={"3a874b7845c28583"}
     name={"2017-06-09--18-23-30"} />,
  document.getElementById('root')
);

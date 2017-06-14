import React from 'react';
import ReactDOM from 'react-dom';
import CanExplorer from './CanExplorer';
import AcuraDbc from './acura-dbc';

import './index.css';

ReactDOM.render(
  <CanExplorer
     dbc={AcuraDbc}
     dongleId={"2d7526b1faf1a2ca"}
     name={"2017-05-22--23-13-46"} />,
  document.getElementById('root')
);

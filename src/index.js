import React from 'react';
import ReactDOM from 'react-dom';
import CanExplorer from './CanExplorer';
import './index.css';

ReactDOM.render(
  <CanExplorer
     url={"https://s3-us-west-2.amazonaws.com/chffrprivate2/v1/comma-2d7526b1faf1a2ca/586e2db5b03b3d653b1bec7e521459f1_2017-05-14--18-25-39"}
     max={53} />,
  document.getElementById('root')
);

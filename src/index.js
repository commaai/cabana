import React from 'react';
import ReactDOM from 'react-dom';
import CanExplorer from './CanExplorer';
import init from './init';
import './index.css';

init().then((props) => {
  ReactDOM.render(<CanExplorer {...props} />, document.getElementById('root')); // eslint-disable-line react/jsx-props-no-spreading
});

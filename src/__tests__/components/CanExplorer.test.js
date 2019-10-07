import React from 'react';
import { shallow, mount, render } from 'enzyme';
import { StyleSheetTestUtils } from 'aphrodite';
import CanExplorer from '../../CanExplorer';

global.__JEST__ = 1;

test('CanExplorer renders', () => {
  const canExplorer = shallow(<CanExplorer />);
});

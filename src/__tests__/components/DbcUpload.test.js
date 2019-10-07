import React from 'react';
import { shallow, mount, render } from 'enzyme';
import DbcUpload from '../../components/DbcUpload';

global.__JEST__ = 1;

test('DbcUpload successfully mounts with minimal default props', () => {
  const component = shallow(<DbcUpload />);
  expect(component.exists()).toBe(true);
});

import React from 'react';
import { shallow, mount, render } from 'enzyme';
import PlayButton from '../../components/PlayButton';

global.__JEST__ = 1;

test('PlayButton successfully mounts with minimal default props', () => {
  const component = shallow(<PlayButton />);
  expect(component.exists()).toBe(true);
});

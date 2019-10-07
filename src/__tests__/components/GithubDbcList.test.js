import React from 'react';
import { shallow, mount, render } from 'enzyme';
import GithubDbcList from '../../components/GithubDbcList';

import OpenDbc from '../../api/OpenDbc';

global.__JEST__ = 1;

test('GithubDbcList successfully mounts with minimal default props', () => {
  const openDbcClient = new OpenDbc(null);

  const component = shallow(
    <GithubDbcList
      onDbcLoaded={() => {}}
      repo="commaai/opendbc"
      openDbcClient={openDbcClient}
    />
  );
  expect(component.exists()).toBe(true);
});

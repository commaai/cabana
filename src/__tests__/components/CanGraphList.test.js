import React from 'react';
import { shallow, mount, render } from 'enzyme';
import CanGraphList from '../../components/CanGraphList';

global.__JEST__ = 1;

test('CanGraphList successfully mounts with minimal default props', () => {
  const component = shallow(
    <CanGraphList
      plottedSignals={[]}
      messages={{}}
      graphData={[]}
      onGraphTimeClick={() => {}}
      seekTime={0}
      onSegmentChanged={() => {}}
      onSignalUnplotPressed={() => {}}
      segment={[]}
      mergePlots={() => {}}
      live
    />
  );
  expect(component.exists()).toBe(true);
});

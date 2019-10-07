import React from 'react';
import { shallow, mount, render } from 'enzyme';
import CanLog from '../../components/CanLog';

global.__JEST__ = 1;

test('CanLog successfully mounts with minimal default props', () => {
  const component = shallow(
    <CanLog
      message={null}
      messageIndex={0}
      segmentIndices={[]}
      plottedSignals={[]}
      onSignalPlotPressed={() => {}}
      onSignalUnplotPressed={() => {}}
      showAddSignal={() => {}}
      onMessageExpanded={() => {}}
    />
  );
  expect(component.exists()).toBe(true);
});

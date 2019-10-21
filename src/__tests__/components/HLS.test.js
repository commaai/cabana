/* eslint-env jest */
import React from 'react';
import { shallow, mount, render } from 'enzyme';
import HLSMock from '@commaai/hls.js';
import HLS from '../../components/HLS';

jest.mock('@commaai/hls.js', () => {
  const onMock = jest.fn();
  const destroyMock = jest.fn();
  const module = jest.fn().mockImplementation(() => ({
    on: onMock,
    destroy: destroyMock,
  }));

  module.onMock = onMock;
  module.destroyMock = destroyMock;

  return module;
});

HLSMock.Events = {
  MANIFEST_PARSED: 0,
  BUFFER_APPENDED: 1
};

beforeEach(() => {
  HLSMock.mockClear();
  HLSMock.onMock.mockClear();
  HLSMock.destroyMock.mockClear();
});

test('HLS successfully mounts with minimal default props', () => {
  const component = shallow(
    <HLS
      source="http://comma.ai"
      startTime={0}
      playbackSpeed={1}
      onVideoElementAvailable={() => {}}
      playing={false}
      onClick={() => {}}
      onLoadStart={() => {}}
      onLoadEnd={() => {}}
      onUserSeek={() => {}}
      onPlaySeek={() => {}}
      segmentProgress={() => {}}
      shouldRestart={false}
      onRestart={() => {}}
    />
  );
  expect(component.exists()).toBe(true);
  expect(HLSMock).toBeCalledWith({
    enableWorker: false,
    disablePtsDtsCorrectionInMp4Remux: true
  });
});

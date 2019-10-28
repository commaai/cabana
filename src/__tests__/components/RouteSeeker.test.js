/* eslint-env jest */
import React from 'react';
import { shallow, mount, render } from 'enzyme';
import RouteSeeker from '../../components/RouteSeeker';
import PlayButton from '../../components/PlayButton';

describe('RouteSeeker', () => {
  it('successfully mounts with minimal default props', () => {
    const component = shallow(
      <RouteSeeker
        nearestFrameTime={0}
        segmentProgress={() => {}}
        videoLength={0}
        segmentIndices={[]}
        segment={[]}
        onUserSeek={() => {}}
        onPlaySeek={() => {}}
        videoElement={null}
        onPlay={() => {}}
        onPause={() => {}}
        playing={false}
        ratioTime={() => {}}
      />
    );
    expect(component.exists()).toBe(true);
  });
  it('registers a timer onPlay', () => {
    const videoElement = {
      pause: jest.fn()
    };
    const component = shallow(
      <RouteSeeker
        nearestFrameTime={0}
        segmentProgress={() => {}}
        videoLength={0}
        segmentIndices={[]}
        segment={[]}
        onUserSeek={() => {}}
        onPlaySeek={() => {}}
        videoElement={videoElement}
        onPlay={() => {}}
        onPause={() => {}}
        playing={false}
        ratioTime={() => {}}
      />
    );
    const rafMock = window.requestAnimationFrame = jest.fn();

    expect(component.exists()).toBe(true);
    const playButton = component.find(PlayButton);
    expect(playButton.exists()).toBe(true);
    expect(rafMock).not.toBeCalled();
    playButton.invoke('onPlay')();
    expect(rafMock).toBeCalled();
  });
  it('only loops at the end of a segment', () => {
    const videoElement = {
      pause: jest.fn(),
      currentTime: 3,
      duration: 10
    };
    const onPlay = jest.fn();
    const component = shallow(
      <RouteSeeker
        nearestFrameTime={0}
        segmentProgress={() => {}}
        videoLength={10}
        segmentIndices={[]}
        segment={[]}
        onUserSeek={() => {}}
        onPlaySeek={() => {}}
        videoElement={videoElement}
        onPlay={onPlay}
        onPause={() => {}}
        playing={false}
        ratioTime={() => {}}
        startTime={0}
      />
    );
    const rafMock = window.requestAnimationFrame = jest.fn();

    expect(component.exists()).toBe(true);
    const playButton = component.find(PlayButton);
    expect(playButton.exists()).toBe(true);
    playButton.invoke('onPlay')();
    expect(onPlay).toBeCalled();
    expect(rafMock).toBeCalled();
    const [playTimer] = rafMock.mock.calls[0];

    playTimer();

    expect(component.state('ratio')).toBe(0.3);

    videoElement.currentTime = 10.1;

    expect(videoElement.pause).not.toBeCalled();
    playTimer();
    expect(videoElement.pause).toBeCalled();

    videoElement.pause.mockClear();

    videoElement.currentTime = 3;
    playButton.invoke('onPlay')();
    playTimer();
    expect(component.state('ratio')).toBe(0.3);

    component.setProps({
      segment: [1, 2]
    });

    videoElement.currentTime = 10.1;
    playTimer();
    expect(videoElement.pause).not.toBeCalled();
  });
});

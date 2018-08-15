global.__JEST__ = 1;

import RouteSeeker from "../../components/RouteSeeker";
import React from "react";
import { shallow, mount, render } from "enzyme";

import { Provider } from "react-redux";
import createStore from "../../store";
const store = createStore();

test("RouteSeeker successfully mounts with minimal default props", () => {
  const component = shallow(
    <Provider store={store}>
      <RouteSeeker
        nearestFrameTime={0}
        segmentProgress={() => {}}
        secondsLoaded={0}
        onUserSeek={() => {}}
        onPlaySeek={() => {}}
        videoElement={null}
        onPlay={() => {}}
        onPause={() => {}}
        playing={false}
        ratioTime={() => {}}
      />
    </Provider>
  );
  expect(component.exists()).toBe(true);
});

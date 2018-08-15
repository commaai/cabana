import HLS from "../../components/HLS";
import React from "react";
import { shallow, mount, render } from "enzyme";

import { Provider } from "react-redux";
import createStore from "../../store";
const store = createStore();

test("HLS successfully mounts with minimal default props", () => {
  const component = shallow(
    <Provider store={store}>
      <HLS
        source={"http://comma.ai"}
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
    </Provider>
  );
  expect(component.exists()).toBe(true);
});

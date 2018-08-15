global.__JEST__ = 1;

import Explorer from "../../components/Explorer";
import React from "react";
import Moment from "moment";
import { shallow, mount, render } from "enzyme";

import { Provider } from "react-redux";
import createStore from "../../store";
const store = createStore();

test("Explorer successfully mounts with minimal default props", () => {
  const component = shallow(
    <Provider store={store}>
      <Explorer
        url={null}
        live={true}
        messages={{}}
        selectedMessage={null}
        onConfirmedSignalChange={() => {}}
        onSeek={() => {}}
        onUserSeek={() => {}}
        canFrameOffset={0}
        firstCanTime={0}
        seekTime={0}
        seekIndex={0}
        currentParts={[0, 0]}
        partsLoaded={0}
        autoplay={true}
        showEditMessageModal={() => {}}
        onPartChange={() => {}}
        routeStartTime={Moment()}
        partsCount={0}
      />
    </Provider>
  );
  expect(component.exists()).toBe(true);
});

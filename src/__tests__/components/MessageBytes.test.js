global.__JEST__ = 1;

import React from "react";
import { shallow, mount, render } from "enzyme";

import MessageBytes from "../../components/MessageBytes";
import DbcUtils from "../../utils/dbc";
import DBC from "../../models/can/dbc";

test("MessageBytes successfully mounts with minimal default props", () => {
  const message = DbcUtils.createMessageSpec(new DBC(), 0, "0", 1);
  const component = shallow(
    <MessageBytes seekTime={0} message={message} live={true} />
  );
  expect(component.exists()).toBe(true);
});

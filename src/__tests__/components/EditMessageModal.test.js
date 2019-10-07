import React from 'react';
import { shallow, mount, render } from 'enzyme';
import EditMessageModal from '../../components/EditMessageModal';
import DbcUtils from '../../utils/dbc';
import DBC from '../../models/can/dbc';

global.__JEST__ = 1;

test('EditMessageModal successfully mounts with minimal default props', () => {
  const dbc = new DBC();
  const frame = dbc.createFrame(0);
  const message = DbcUtils.createMessageSpec(dbc, 0, '0', 1);

  const component = shallow(
    <EditMessageModal
      handleClose={() => {}}
      handleSave={() => {}}
      message={message}
    />
  );
  expect(component.exists()).toBe(true);
});

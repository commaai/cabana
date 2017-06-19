import DBC, {swapOrder} from '../../models/can/dbc';
import {ACURA_DBC} from '../res/acura-dbc';

test('DBC.text() for acura DBC should be equivalent to its original text', () => {
    const dbc = new DBC(ACURA_DBC);

    expect(dbc.text()).toBe(ACURA_DBC);
});
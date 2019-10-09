/* eslint-env jest */
import {
  signedShortToByteArray,
  shortToByteArray,
  longToByteArray,
  signedLongToByteArray,
  getThermalFlags,
  // getHealthFlags,
  // getFlags,
  // getUbloxGnss,
  // getEgoData,
  // getCarStateControls,
  // getWheelSpeeds,
  // getThermalFreeSpace,
  // getThermalData,
  // getThermalCPU,
  // getHealth
} from '../../workers/rlog-utils';

describe('byte array methods', () => {
  test('signedShortToByteArray', () => {
    expect(signedShortToByteArray(123)).toMatchObject([0, 123]);
    expect(signedShortToByteArray(-123)).toMatchObject([255, 133]);
  });
  test('shortToByteArray', () => {
    expect(shortToByteArray(123)).toMatchObject([0, 123]);
    expect(shortToByteArray(-123)).toMatchObject([255, 133]);
  });
  test('longToByteArray', () => {
    expect(longToByteArray(123)).toMatchObject([0, 0, 0, 123]);
    expect(longToByteArray(-123)).toMatchObject([255, 255, 255, 133]);
  });
  test('signedLongToByteArray', () => {
    expect(signedLongToByteArray(123)).toMatchObject([0, 0, 0, 123]);
    expect(signedLongToByteArray(-123)).toMatchObject([255, 255, 255, 133]);
  });
});

describe('flags', () => {
  test('getThermalFlags', () => {
    expect(getThermalFlags({
      UsbOnline: false,
      Started: false
    })).toBe(0x00);

    expect(getThermalFlags({
      UsbOnline: true,
      Started: false
    })).toBe(0x01);

    expect(getThermalFlags({
      UsbOnline: false,
      Started: true
    })).toBe(0x02);

    expect(getThermalFlags({
      UsbOnline: true,
      Started: true
    })).toBe(0x03);
  });
});

import Signal from '../../models/can/signal';

const someSignalParams = {
    name: 'STEER_TORQUE',
    startBit: 7,
    size: 16,
    isLittleEndian: false,
    isSigned: true,
    factor: 1,
    offset: 0,
    min: -3840,
    max: 3840,
    unit: ""};

const someOtherSignalParams = {
    name: 'DIFFERENT_NAME',
    startBit: 0,
    size: 16,
    isLittleEndian: false,
    isSigned: true,
    factor: 1,
    offset: 0,
    min: -3840,
    max: 3840,
    unit: ""};

test('Signal.equals returns true for signals with identical properties', () => {
    const someSignal = new Signal(someSignalParams);
    const someEquivalentSignal = new Signal(someSignalParams);
    expect(someSignal.equals(someEquivalentSignal)).toBe(true);
});

test('Signal.equals returns false for signals with different properties', () => {
    const someSignal = new Signal(someSignalParams);
    const differentSignal = new Signal(someOtherSignalParams);
    expect(someSignal.equals(differentSignal)).toBe(false);
});

test('Signal.bitDescription returns proper description for a little endian signal', () => {
    const littleEndianSignal = new Signal({name: 'little endian signal',
                                           startBit: 20,
                                           size: 4,
                                           isLittleEndian: true});

    expect(littleEndianSignal.bitDescription(20).bitNumber).toBe(0);
    expect(littleEndianSignal.bitDescription(21).bitNumber).toBe(1);
    expect(littleEndianSignal.bitDescription(22).bitNumber).toBe(2);
    expect(littleEndianSignal.bitDescription(23).bitNumber).toBe(3);
});

test('Signal.bitDescription returns proper description for a big endian signal', () => {
    const bigEndianSignal = new Signal({name: 'big endian signal',
                                           startBit: 7,
                                           size: 16,
                                           isLittleEndian: false});

    expect(bigEndianSignal.bitDescription(15).bitNumber).toBe(0);
    expect(bigEndianSignal.bitDescription(0).bitNumber).toBe(15);
    expect(bigEndianSignal.bitDescription(16)).toBe(null);
});


test('Signal.bitDescription returns null for bit index that is not in its range', () => {
    const someSignal = new Signal({name: 'some signal',
                                   startBit: 20,
                                   size: 4,
                                   isLittleEndian: false});

    expect(someSignal.bitDescription(18)).toBe(null);
    expect(someSignal.bitDescription(23)).toBe(null);
});

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
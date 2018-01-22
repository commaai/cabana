import DbcUtils from "../../utils/dbc";

const unsignedTransformation = field => {
  return (value, signal) => {
    if (value !== "") {
      value = Number(value) || 0;

      if (value < 0) {
        value = 0;
      }
    }
    signal[field] = value;
    return signal;
  };
};

export default [
  {
    field: "name",
    title: "Name",
    type: "string"
  },
  {
    field: "size",
    title: "Size",
    type: "number",
    transform: unsignedTransformation("size")
  },
  {
    field: "startBit",
    title: signal =>
      signal.isLittleEndian ? "Least significant bit" : "Most significant bit",
    type: "number",
    transform: unsignedTransformation("startBit")
  },
  {
    field: "isLittleEndian",
    title: "Endianness",
    type: "option",
    options: {
      options: ["Little", "Big"],
      optionValues: { Little: true, Big: false }
    },
    transform: (isLittleEndian, signal) => {
      if (signal.isLittleEndian !== isLittleEndian) {
        const { startBit } = signal;

        if (isLittleEndian) {
          // big endian -> little endian
          const startByte = Math.floor(signal.startBit / 8),
            endByte = Math.floor((signal.startBit - signal.size + 1) / 8);

          if (startByte === endByte) {
            signal.startBit = signal.startBit - signal.size + 1;
          } else {
            signal.startBit = DbcUtils.matrixBitNumber(startBit);
          }
        } else {
          // little endian -> big endian
          const startByte = Math.floor(signal.startBit / 8),
            endByte = Math.floor((signal.startBit + signal.size - 1) / 8);

          if (startByte === endByte) {
            signal.startBit = signal.startBit + signal.size - 1;
          } else {
            signal.startBit = DbcUtils.bigEndianBitIndex(startBit);
          }
        }
        signal.isLittleEndian = isLittleEndian;
      }
      return signal;
    }
  },
  {
    field: "isSigned",
    title: "Sign",
    type: "option",
    options: {
      options: ["Signed", "Unsigned"],
      optionValues: { Signed: true, Unsigned: false }
    }
  },
  {
    field: "factor",
    title: "Factor",
    type: "number"
  },
  {
    field: "offset",
    title: "Offset",
    type: "number"
  },
  {
    field: "unit",
    title: "Unit",
    type: "string"
  },
  {
    field: "comment",
    title: "Comment",
    type: "string"
  },
  {
    field: "min",
    title: "Minimum value",
    type: "number"
  },
  {
    field: "max",
    title: "Maximum value",
    type: "number"
  }
];

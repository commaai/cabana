const Uint64BE = require("int64-buffer").Uint64BE;

export function formatForMsg(msg) {
  return { bstart: 0, bend: 15 };
}

export function formatMsgDec(msg) {
  const { bstart, bend } = formatForMsg(msg);
  const uint = Uint64BE(msg[1]);
  var tt = "0" + uint.toString(2);
  tt = tt.substring(0, tt.length - (63 - bend));
  tt = tt.substring(tt.length - (bend - bstart) - 1);
  return [msg[0], parseInt(tt, 2)];
}

export function uint64BEToHex(int64) {
  return Uint64BE(int64).toString(16);
}

export function int64BufferToPrettyHexStr(buffer) {
  const uint = Uint64BE(buffer);
  let hex = uint.toString(16);
  if (hex.length === 1) hex = "0" + hex;
  let hexParts = hex.match(/.{1,2}/g);

  return hexParts.join(" ");
}

export function formatMsgHex(msg) {
  const uint = Uint64BE(msg[1]);
  let hex = uint.toString(16);
  if (hex.length === 1) hex = "0" + hex;
  let hexParts = hex.match(/.{1,2}/g);

  return [msg[0], hexParts.join(" ")];
}

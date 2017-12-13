import Panda from "../../api/panda";

function arrayBufferFromHex(hex) {
  const buffer = Buffer.from(hex, "hex");
  const arrayBuffer = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(arrayBuffer);
  for (let i = 0; i < buffer.length; i++) {
    view[i] = buffer[i];
  }
  return arrayBuffer;
}

test("parseCanBuffer correctly parses a message", () => {
  const panda = new Panda();
  // 16 byte buffer

  const arrayBuffer = arrayBufferFromHex("abababababababababababababababab");

  const messages = panda.parseCanBuffer(arrayBuffer);
  expect(messages.length).toEqual(1);
  expect(messages[0]).toEqual([1373, 43947, "abababababababab", 10]);
});

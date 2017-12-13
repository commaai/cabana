import { shade } from "../../utils/color";

test("Shade darkens rgb white (255,255,255)", () => {
  const rgb = [255, 255, 255];
  const darkenRgb = shade(rgb, -0.5);

  expect(darkenRgb).toEqual([128, 128, 128]);
});

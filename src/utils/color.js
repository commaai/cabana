export function shade([r, g, b], opacity) {
  /*
    @param {Array} rgb
    @param {Number} opacity -1.0 -> +1.0
        negative opacity will darken image

    returns new RGB array
    */
  const t = opacity < 0 ? 0 : 255;
  const opacityPos = Math.abs(opacity);

  return [
    Math.round((t - r) * opacityPos) + r,
    Math.round((t - g) * opacityPos) + g,
    Math.round((t - b) * opacityPos) + b
  ];
}

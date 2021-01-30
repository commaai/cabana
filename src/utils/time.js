export default function FormatTime(sec) {
  let bs = 11;
  if (sec < 60) {
    bs = 17;
  } else if (sec < 3600) {
    bs = 14;
  }
  return new Date(sec * 1e3).toISOString().slice(bs, -1)
}

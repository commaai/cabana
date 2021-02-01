export default function FormatTime(sec,vega = false) {
  let bs = 11;
  if (sec < 60) {
    if (vega) {
      bs = 14;
    } else {
      bs = 17;
    }
  } else if (sec < 3600) {
    bs = 14;
  }
  let sh = -1;
  if (vega) {
    sh = -5;
  }
  let res = 0;
  try {
    res = new Date(sec * 1e3).toISOString().slice(bs, sh);
  } catch(error) {
    console.error(error);
  }
  return res;
}

/* eslint-disable no-restricted-globals */
import Sentry from "../logging/Sentry";

import * as CanApi from "../api/can";

var window = self;

function calcCanFrameOffset(firstCanPart, partCanTimes) {
  const firstCanTime = partCanTimes[0];
  const firstPartLastCanTime = partCanTimes[partCanTimes.length - 1];

  return 60 * firstCanPart + (60 - (firstPartLastCanTime - firstCanTime));
}

async function fetchCanTimes(base, part) {
  const times = await CanApi.fetchCanTimes(base, part);
  return times.length > 0 ? times : null;
}

async function onMessage(e) {
  const { base, partCount } = e.data;
  var canTimes = null;

  // intentional off by one error!
  // we never want to check the very last segment because the code doesn't actually work on last segments
  // we don't have enough info in memory to do this...
  // if can messages start in the final segment of a route, then you don't get any can messages.
  for (let part = 0; part < partCount; part++) {
    canTimes = await fetchCanTimes(base, part);

    if (canTimes !== null) {
      const canFrameOffset = calcCanFrameOffset(part, canTimes);
      self.postMessage({ canFrameOffset, firstCanTime: canTimes[0] });
      canTimes = null;
      self.close();
      break;
    }
  }

  if (!canTimes || !canTimes.length) {
    // get the last segment but dont do any of the fancy stuff
    // we fakin it
    canTimes = await fetchCanTimes(base, partCount);
  }

  if (canTimes && canTimes.length) {
    // if we didn't find anything, return the first can message and fake the offset
    self.postMessage({
      canFrameOffset: 0,
      firstCanTime: canTimes[0]
    });
  }
  self.close();
}

self.onmessage = onMessage;

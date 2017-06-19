import * as CanApi from '../api/can';

function calcCanFrameOffset(firstCanPart, partCanTimes) {
  const firstCanTime = partCanTimes[0];
  const firstPartLastCanTime = partCanTimes[partCanTimes.length - 1];

  return (60 * firstCanPart
          - (60 - (firstPartLastCanTime - firstCanTime)));
}

async function fetchCanTimes(base, part) {
    const times = await CanApi.fetchCanTimes(base, part);
    return times.length > 0 ? times : null;
}

async function onMessage(e) {
    const {base, partCount} = e.data;

    for(let part = 0; part < partCount; part++) {
        const canTimes = await fetchCanTimes(base, part);

        if(canTimes !== null) {
            const canFrameOffset = calcCanFrameOffset(part, canTimes);
            self.postMessage({canFrameOffset, firstCanTime: canTimes[0]});
            self.close();
            break;
        }
    }
}

self.onmessage = onMessage;

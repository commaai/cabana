import NumpyLoader from "../utils/loadnpy";

export async function fetchCanTimes(base, part) {
  const url = base + "/Log/" + part + "/can/t";

  const canData = await NumpyLoader.promise(url);

  return canData.data;
}

export async function fetchCanPart(base, part) {
  var urls = [
    base + "/Log/" + part + "/can/t",
    base + "/Log/" + part + "/can/src",
    base + "/Log/" + part + "/can/address",
    base + "/Log/" + part + "/can/data"
  ];

  var messages = {};
  let canData = null;
  try {
    canData = await Promise.all(urls.map(NumpyLoader.promise));
  } catch (e) {
    console.log("this is a 404 workaround that is hacky", e);
    return {
      times: [],
      sources: [],
      addresses: [],
      datas: []
    };
  }
  return {
    times: canData[0].data,
    sources: canData[1].data,
    addresses: canData[2].data,
    datas: canData[3].data
  };
}

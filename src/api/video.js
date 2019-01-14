const STREAM_VERSION = 1;

function videoUrl(dongleId, hashedRouteName) {
  return `${
    process.env.REACT_APP_VIDEO_CDN
  }/hls/${dongleId}/${hashedRouteName}/index.m3u8?v=${STREAM_VERSION}`;
}

function videoUrlForRouteUrl(routeUrlString) {
  const url = new URL(routeUrlString);

  const pathParts = url.pathname.split("/");

  const [dongleIdPrefixed, hashedRouteName] = pathParts.slice(
    pathParts.length - 2
  );
  let dongleId = dongleIdPrefixed;
  if (dongleIdPrefixed.indexOf("comma-") === 0) {
    const [, dongleIdNoPrefix] = dongleIdPrefixed.split("comma-");
    dongleId = dongleIdNoPrefix;
  }

  return videoUrl(dongleId, hashedRouteName);
}

export default { videoUrl, videoUrlForRouteUrl };

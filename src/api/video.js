function videoUrl(dongleId, hashedRouteName) {
  return `https://comma-video.azureedge.net/hls/${dongleId}/${hashedRouteName}/index.m3u8`;
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

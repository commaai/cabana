import {parseUrl} from '../utils/url';

function videoUrl(dongleId, hashedRouteName) {
  return `https://video.comma.ai/hls/${dongleId}/${hashedRouteName}/index.m3u8`;
}

function videoUrlForRouteUrl(routeUrlString) {
  const url = new URL(routeUrlString);

  const pathParts = url.pathname.split('/');

  const [dongleIdPrefixed, hashedRouteName] = pathParts.slice(pathParts.length - 2);
  let dongleId = dongleIdPrefixed
  if(dongleIdPrefixed.indexOf('comma-') === 0) {
    const [_, dongleIdNoPrefix] = dongleIdPrefixed.split('comma-');
    dongleId = dongleIdNoPrefix;
  }

  // comma-2d7526b1faf1a2ca/586e2db5b03b3d653b1bec7e521459f1_2017-05-14--18-25-39"
  // "https://s3-us-west-2.amazonaws.com/chffrprivate2/v1/comma-2d7526b1faf1a2ca/586e2db5b03b3d653b1bec7e521459f1_2017-05-14--18-25-39"
  // const

  return videoUrl(dongleId, hashedRouteName);
}

export default {videoUrl, videoUrlForRouteUrl};

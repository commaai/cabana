const ROUTES_ENDPOINT = 'https://api.commadotai.com/v1/{dongleId}/routes/';

const DEMO_ROUTES = {
    "2017-05-14--18-25-39": {
      // this route hls is broken
      "can": true,
      "device_type": 3,
      "end_geocode": "Santa Cruz",
      "end_lat": 36.9722,
      "end_lng": -122.036,
      "end_time": "2017-05-14T19:14:59",
      "fullname": "2d7526b1faf1a2ca|2017-05-14--18-25-39",
      "len": 49.0554,
      "maxcamera": 53,
      "maxlog": 53,
      "movie": true,
      "piececount": 53,
      "proccamera": 53,
      "proclog": 53,
      "start_geocode": "Carmel-by-the-Sea",
      "start_lat": 36.5191,
      "start_lng": -121.933,
      "start_time": "2017-05-14T18:25:39",
      "url": "https://s3-us-west-2.amazonaws.com/chffrprivate2/v1/comma-2d7526b1faf1a2ca/586e2db5b03b3d653b1bec7e521459f1_2017-05-14--18-25-39"
    },
    "2017-05-22--23-13-46": {
      "can": true,
      "device_type": 3,
      "end_geocode": "Daly City",
      "end_lat": 37.7393,
      "end_lng": -122.465,
      "end_time": "2017-05-22T23:35:27",
      "fullname": "2d7526b1faf1a2ca|2017-05-22--23-13-46",
      "len": 9.74847,
      "maxcamera": 21,
      "maxlog": 21,
      "movie": true,
      "piececount": 21,
      "proccamera": 21,
      "proclog": 21,
      "start_geocode": "Brisbane",
      "start_lat": 37.7245,
      "start_lng": -122.402,
      "start_time": "2017-05-22T23:13:46",
      "url": "https://s3-us-west-2.amazonaws.com/chffrprivate2/v1/comma-2d7526b1faf1a2ca/9786fc057e85a6954742734b11fdb141_2017-05-22--23-13-46"
  }
};

export async function fetchRoutes(dongleId) {
    if(dongleId !== undefined) {
        dongleId = 'me';
    }
    const endpoint= ROUTES_ENDPOINT.replace('{dongleId}', dongleId);
    try {
        const resp = await fetch(endpoint);
        const routes = await resp.json();
        if('routes' in routes) {
            return routes;
        }
    } catch(err) {
        console.log(err);
    }
    return DEMO_ROUTES;
}

export function cameraPath(routeUrl, frame) {
  return `${routeUrl}/sec${frame}.jpg`
}

# Cabana

<img src="https://cabana.comma.ai/img/cabana.jpg" width="640" height="267" />

Cabana is a tool developed to view raw CAN data. One use for this is creating and editing [CAN Dictionaries](http://socialledge.com/sjsu/index.php/DBC_Format) (DBC files), and the tool provides direct integration with [commaai/opendbc](https://github.com/commaai/opendbc) (a collection of DBC files), allowing you to load/save the DBC files direct from source. In addition, you can load routes from [comma connect](https://connect.comma.ai).

## Usage Instructions

### Opening a Route
1. Go to the [web page](https://cabana.comma.ai)
1. Sign in with one of the providers
    * If you want to save edited DBC files to your fork of opendbc on GitHub, press the *Log in with GitHub* button in the top right
1. Find a route within [connect](https://connect.comma.ai)
1. With a route open, click *More info* in the middle right
  1. If it says "missing logs", click *upload*. This will make the comma device upload the respective log files.
1. Click *View in cabana*

    ![image](https://user-images.githubusercontent.com/2822945/168487944-7cc32906-288e-46f5-bc8a-61bd5328de50.png)

### Sharing Cabana Links
If you need to share a link to a route in Cabana, do the following:
1. In [useradmin](https://useradmin.comma.ai), log in and open the route
    * You may want to **preserve** the route, which will make sure it isn't deleted. On useradmin homepage, click *preserve* next a route.
1. Click *make public*

    ![image](https://user-images.githubusercontent.com/2822945/168488185-02500496-6b6c-434f-a55a-21e1d6482e60.png)

1. Open the route in [connect](https://connect.comma.ai) (there is a link to do this right next to *make public*)
1. Follow the above instructions to [Open a Route](open-a-route)

### Reverse Engineering Your Car
One big purpose of Cabana is to discover new CAN messages and signals.

A good way to go about this is to use the [`can_bit_transition.py`](https://github.com/commaai/panda/blob/master/examples/can_bit_transition.md) script in the panda repo. The idea with this script is that, provided logs downloaded from Cabana, you can quickly locate a specific bit flip.


## Setup

```bash
yarn
yarn run sass
```

## Development

```bash
yarn start
```

## Contributing

```bash
yarn run test
```

## Deploy to Production

```bash
npm version patch
git push origin master --tags # push version patch
yarn run deploy # builds and deploys to github pages
```

### errors building libusb modules?

You can safely ignore those errors even though it returns 1. If you'd like them to go away just because they're annoying, install libusb-dev...

```bash
sudo apt-get install -y libusb-dev libudev-dev
```

or

```bash
brew install libusb
```

# Create React App documentation

This project was bootstrapped with [Create React App](https://github.com/facebookincubator/create-react-app) v1.x, then upgraded to `react-scripts` v3.x and use [craco](http://npm.im/@craco/craco) to customize it.

You can read the create react app [documentation here](https://create-react-app.dev/docs/getting-started)

We use craco to easily add [worker-loader](https://npm.im/worker-loader).

## License

[MIT](/LICENSE)

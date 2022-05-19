# Cabana

<img src="https://cabana.comma.ai/img/cabana.jpg" width="640" height="267" />

Cabana is a tool developed to view raw CAN data. One use for this is creating and editing [CAN Dictionaries](http://socialledge.com/sjsu/index.php/DBC_Format) (DBC files), and the tool provides direct integration with [commaai/opendbc](https://github.com/commaai/opendbc) (a collection of DBC files), allowing you to load the DBC files direct from source, and save to your fork. In addition, you can load routes from [comma connect](https://connect.comma.ai).

## Usage Instructions

See [openpilot wiki](https://github.com/commaai/openpilot/wiki/Cabana)

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

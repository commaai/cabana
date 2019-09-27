# Cabana

<img src="https://my.comma.ai/cabana/img/cabana.jpg" width="640" height="267" />

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

You can read the create react app [documentation here](https://create-react-app.dev/docs/)

We use craco to easily add [worker-loader](https://npm.im/worker-loader).

## License

[MIT](/LICENSE)

import Raven from 'raven-js';
if(process.env.NODE_ENV === 'production') {
  const opts = {};

  if(window.__webpack_hash__ !== undefined) {
      opts['release'] = window.__webpack_hash__;
  }

  Raven
      .config('https://50006e5d91894f508dd288bbbf4585a6@sentry.io/185303', opts)
      .install();
}

import Raven from "raven-js";

function init() {
  if (process.env.NODE_ENV === "production") {
    const opts = {};

    if (typeof __webpack_hash__ !== "undefined") {
      opts["release"] = __webpack_hash__; // eslint-disable-line no-undef
    }

    Raven.config(
      "https://50006e5d91894f508dd288bbbf4585a6@sentry.io/185303",
      opts
    ).install();
  }
}

export default { init };

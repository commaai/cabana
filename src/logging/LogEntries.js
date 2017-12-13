// Vendored from https://github.com/rapid7/le_js, which is broken with webpack.
/* eslint-disable */

if (typeof window === "undefined") {
  // eslint-disable-line no-use-before-define
  var window = self;
}
var _indexOf = function(array, obj) {
  for (var i = 0; i < array.length; i++) {
    if (obj === array[i]) {
      return i;
    }
  }
  return -1;
};

// Obtain a browser-specific XHR object
var _getAjaxObject = function() {
  if (typeof XDomainRequest !== "undefined") {
    // We're using IE8/9
    return new XDomainRequest();
  }
  return new XMLHttpRequest();
};

/**
 * A single log event stream.
 * @constructor
 * @param {Object} options
 */
function LogStream(options) {
  /**
   * @const
   * @type {string} */
  var _traceCode = options.trace
    ? (Math.random() + Math.PI).toString(36).substring(2, 10)
    : null;
  /** @type {string} */
  var _pageInfo = options.page_info;
  /** @type {string} */
  var _token = options.token;
  /** @type {boolean} */
  var _print = options.print;
  /** @type {boolean} */
  var _noFormat = options.no_format;
  /** @type {boolean} */
  var _SSL = (function() {
    if (typeof XDomainRequest === "undefined") {
      return options.ssl;
    }
    // If we're relying on XDomainRequest, we
    // must adhere to the page's encryption scheme.
    return window.location.protocol === "https:" ? true : false;
  })();
  /** @type {string} */
  var _endpoint;
  if (window.LEENDPOINT) {
    _endpoint = window.LEENDPOINT;
  } else if (_noFormat) {
    _endpoint = "webhook.logentries.com/noformat";
  } else {
    _endpoint = "js.logentries.com/v1";
  }
  _endpoint = (_SSL ? "https://" : "http://") + _endpoint + "/logs/" + _token;

  /**
   * Flag to prevent further invocations on network err
   ** @type {boolean} */
  var _shouldCall = true;
  /** @type {Array.<string>} */
  var _backlog = [];
  /** @type {boolean} */
  var _active = false;
  /** @type {boolean} */
  var _sentPageInfo = false;

  var _apiCall = function(token, data) {
    _active = true;

    var request = _getAjaxObject();

    if (_shouldCall) {
      if (request.constructor === XMLHttpRequest) {
        // Currently we don't support fine-grained error
        // handling in older versions of IE
        request.onreadystatechange = function() {
          if (request.readyState === 4) {
            // Handle any errors
            if (request.status >= 400) {
              console.error("Couldn't submit events.");
              if (request.status === 410) {
                // This API version has been phased out
                console.warn("This version of le_js is no longer supported!");
              }
            } else {
              if (request.status === 301) {
                // Server issued a deprecation warning
                console.warn(
                  "This version of le_js is deprecated! Consider upgrading."
                );
              }
              if (_backlog.length > 0) {
                // Submit the next event in the backlog
                _apiCall(token, _backlog.shift());
              } else {
                _active = false;
              }
            }
          }
        };
      } else {
        request.onload = function() {
          if (_backlog.length > 0) {
            // Submit the next event in the backlog
            _apiCall(token, _backlog.shift());
          } else {
            _active = false;
          }
        };
      }

      request.open("POST", _endpoint, true);
      if (request.constructor === XMLHttpRequest) {
        request.setRequestHeader("X-Requested-With", "XMLHttpRequest");
        request.setRequestHeader("Content-type", "application/json");
      }

      if (request.overrideMimeType) {
        request.overrideMimeType("text");
      }

      request.send(data);
    }
  };

  var _getEvent = function() {
    var raw = null;
    var args = Array.prototype.slice.call(arguments);
    if (args.length === 0) {
      throw new Error("No arguments!");
    } else if (args.length === 1) {
      raw = args[0];
    } else {
      // Handle a variadic overload,
      // e.g. _rawLog("some text ", x, " ...", 1);
      raw = args;
    }
    return raw;
  };

  var _agentInfo = function() {
    var nav = window.navigator || { doNotTrack: undefined };
    var screen = window.screen || {};
    var location = window.location || {};

    return {
      url: location.pathname,
      referrer: document.referrer,
      screen: {
        width: screen.width,
        height: screen.height
      },
      window: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      browser: {
        name: nav.appName,
        version: nav.appVersion,
        cookie_enabled: nav.cookieEnabled,
        do_not_track: nav.doNotTrack
      },
      platform: nav.platform
    };
  };

  // Single arg stops the compiler arity warning
  var _rawLog = function(msg) {
    var event = _getEvent.apply(this, arguments);

    var data = { event: event };

    // Add agent info if required
    if (_pageInfo !== "never") {
      if (!_sentPageInfo || _pageInfo === "per-entry") {
        _sentPageInfo = true;
        if (
          typeof event.screen === "undefined" &&
          typeof event.browser === "undefined"
        )
          _rawLog(_agentInfo())
            .level("PAGE")
            .send();
      }
    }

    if (_traceCode) {
      data.trace = _traceCode;
    }

    return {
      level: function(l) {
        // Don't log PAGE events to console
        // PAGE events are generated for the agentInfo function
        if (_print && typeof console !== "undefined" && l !== "PAGE") {
          var serialized = null;
          if (typeof XDomainRequest !== "undefined") {
            // We're using IE8/9
            serialized = data.trace + " " + data.event;
          }
          try {
            console[l.toLowerCase()].call(console, serialized || data);
          } catch (ex) {
            // IE compat fix
            console.log(serialized || data);
          }
        }
        data.level = l;

        return {
          send: function() {
            var cache = [];
            var serialized = JSON.stringify(data, function(key, value) {
              if (typeof value === "undefined") {
                return "undefined";
              } else if (typeof value === "object" && value !== null) {
                if (_indexOf(cache, value) !== -1) {
                  // We've seen this object before;
                  // return a placeholder instead to prevent
                  // cycles
                  return "<?>";
                }
                cache.push(value);
              }
              return value;
            });

            if (_active) {
              _backlog.push(serialized);
            } else {
              _apiCall(_token, serialized);
            }
          }
        };
      }
    };
  };

  if (options.catchall) {
    var oldHandler = window.onerror;
    var newHandler = function(msg, url, line) {
      _rawLog({ error: msg, line: line, location: url })
        .level("ERROR")
        .send();
      if (oldHandler) {
        return oldHandler(msg, url, line);
      } else {
        return false;
      }
    };
    window.onerror = newHandler;
  }

  /** @expose */
  this.log = _rawLog;
}

/**
 * A single log object
 * @constructor
 * @param {Object} options
 */
function Logger(options) {
  var logger;

  // Default values
  var dict = {
    ssl: true,
    catchall: false,
    trace: true,
    page_info: "never",
    print: false,
    endpoint: null,
    token: null
  };

  if (typeof options === "object") for (var k in options) dict[k] = options[k];
  else throw new Error("Invalid parameters for createLogStream()");

  if (dict.token === null) {
    throw new Error("Token not present.");
  } else {
    logger = new LogStream(dict);
  }

  var _log = function(msg) {
    if (logger) {
      return logger.log.apply(this, arguments);
    } else throw new Error("You must call LE.init(...) first.");
  };

  // The public interface
  return {
    log: function() {
      _log
        .apply(this, arguments)
        .level("LOG")
        .send();
    },
    warn: function() {
      _log
        .apply(this, arguments)
        .level("WARN")
        .send();
    },
    error: function() {
      _log
        .apply(this, arguments)
        .level("ERROR")
        .send();
    },
    info: function() {
      _log
        .apply(this, arguments)
        .level("INFO")
        .send();
    }
  };
}

// Array of Logger elements
var loggers = {};

var _getLogger = function(name) {
  if (!loggers.hasOwnProperty(name))
    throw new Error("Invalid name for logStream");

  return loggers[name];
};

var _createLogStream = function(options) {
  if (typeof options.name !== "string") throw new Error("Name not present.");
  else if (loggers.hasOwnProperty(options.name))
    throw new Error("A logger with that name already exists!");
  loggers[options.name] = new Logger(options);

  return true;
};

var _deprecatedInit = function(options) {
  var dict = {
    name: "default"
  };

  if (typeof options === "object") for (var k in options) dict[k] = options[k];
  else if (typeof options === "string") dict.token = options;
  else throw new Error("Invalid parameters for init()");

  return _createLogStream(dict);
};

var _destroyLogStream = function(name) {
  if (typeof name === "undefined") {
    name = "default";
  }

  delete loggers[name];
};

// The public interface
export default {
  init: _deprecatedInit,
  createLogStream: _createLogStream,
  to: _getLogger,
  destroy: _destroyLogStream,
  log: function() {
    for (var k in loggers) loggers[k].log.apply(this, arguments);
  },
  warn: function() {
    for (var k in loggers) loggers[k].warn.apply(this, arguments);
  },
  error: function() {
    for (var k in loggers) loggers[k].error.apply(this, arguments);
  },
  info: function() {
    for (var k in loggers) loggers[k].info.apply(this, arguments);
  }
};

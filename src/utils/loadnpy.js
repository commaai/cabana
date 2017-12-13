// Client-side parser for .npy files
// See the specification: http://docs.scipy.org/doc/numpy-dev/neps/npy-format.html

const NumpyLoader = (function NumpyLoader() {
  function asciiDecode(buf) {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
  }

  function readUint16LE(buffer) {
    var view = new DataView(buffer);
    var val = view.getUint8(0);
    val |= view.getUint8(1) << 8;
    return val;
  }

  function fromArrayBuffer(buf) {
    // Check the magic number
    var magic = asciiDecode(buf.slice(0, 6));
    if (magic !== "\x93NUMPY") {
      throw new Error("Bad magic number");
    }

    var version = new Uint8Array(buf.slice(6, 8)),
      headerLength = readUint16LE(buf.slice(8, 10)),
      headerStr = asciiDecode(buf.slice(10, 10 + headerLength));
    const offsetBytes = 10 + headerLength;
    //rest = buf.slice(10+headerLength);  XXX -- This makes a copy!!! https://www.khronos.org/registry/typedarray/specs/latest/#5

    // Hacky conversion of dict literal string to JS Object
    const info = JSON.parse(
      headerStr
        .toLowerCase()
        .replace("(", "[")
        .replace("),", "]")
        .replace(/'/g, '"')
        .replace(",]", "]")
    );

    // Intepret the bytes according to the specified dtype
    var data;
    if (info.descr === "|u1") {
      data = new Uint8Array(buf, offsetBytes);
    } else if (info.descr === "|i1") {
      data = new Int8Array(buf, offsetBytes);
    } else if (info.descr === "<u2") {
      data = new Uint16Array(buf, offsetBytes);
    } else if (info.descr === "<i2") {
      data = new Int16Array(buf, offsetBytes);
    } else if (info.descr === "<u4") {
      data = new Uint32Array(buf, offsetBytes);
    } else if (info.descr === "<i4") {
      data = new Int32Array(buf, offsetBytes);
    } else if (info.descr === "<f4") {
      data = new Float32Array(buf, offsetBytes);
    } else if (info.descr === "<f8") {
      data = new Float64Array(buf, offsetBytes);
    } else if (info.descr === "<u8") {
      // 8 byte uint64s
      data = new Uint8Array(buf, offsetBytes);
    } else if (info.descr === "<i8") {
      // 8 byte int64s
      data = new Uint8Array(buf, offsetBytes);
    } else if (info.descr === "|s5") {
      // 5 byte string
      data = new Uint8Array(buf, offsetBytes);
    } else if (info.descr === "|s8") {
      // 8 byte strings
      data = new Uint8Array(buf, offsetBytes);
    } else if (info.descr === "|s15") {
      // 15 byte strings?
      data = new Uint8Array(buf, offsetBytes);
    } else {
      throw new Error("unknown numeric dtype " + info.descr);
    }

    return {
      shape: info.shape,
      fortran_order: info.fortran_order,
      data: data
    };
  }

  function open(file, callback) {
    var reader = new FileReader();
    reader.onload = function() {
      // the file contents have been read as an array buffer
      var buf = reader.result;
      var ndarray = fromArrayBuffer(buf);
      callback(ndarray);
    };
    reader.readAsArrayBuffer(file);
  }

  function promise(url) {
    return new Promise(function(resolve, reject) {
      // Do the usual XHR stuff
      var req = new XMLHttpRequest();
      req.onload = function() {
        // This is called even on 404 etc
        // so check the status
        if (req.status == 200) {
          var buf = req.response; // not responseText
          var ndarray = fromArrayBuffer(buf);
          resolve(ndarray);
        } else if (req.status == 404) {
          console.log("yup");
          reject({ is404: true });
        } else {
          // Otherwise reject with the status text
          // which will hopefully be a meaningful error
          reject(Error(req.statusText));
        }
      };

      // Handle network errors
      req.onerror = function() {
        reject(Error("Network Error"));
      };

      // Make the request
      req.open("GET", url, true);
      req.responseType = "arraybuffer";
      req.send(null);
    });
  }

  return {
    open: open,
    promise: promise,
    fromArrayBuffer: fromArrayBuffer
  };
})();

module.exports = NumpyLoader;

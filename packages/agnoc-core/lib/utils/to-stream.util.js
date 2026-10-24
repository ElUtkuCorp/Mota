"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.toStream = toStream;
var _stream = require("stream");
function toStream(buffer) {
  return _stream.Readable.from(buffer, {
    objectMode: false
  });
}
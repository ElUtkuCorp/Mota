"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.decodeChargePosition = decodeChargePosition;
var _stream = require("../utils/stream.util");
var _toStream = require("../utils/to-stream.util");
function decodeChargePosition(payload) {
  const stream = (0, _toStream.toStream)(payload);
  return {
    poseId: (0, _stream.readWord)(stream),
    poseX: (0, _stream.readFloat)(stream),
    poseY: (0, _stream.readFloat)(stream),
    posePhi: (0, _stream.readFloat)(stream)
  };
}
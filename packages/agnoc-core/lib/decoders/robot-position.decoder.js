"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.decodeRobotPosition = decodeRobotPosition;
var _stream = require("../utils/stream.util");
var _toStream = require("../utils/to-stream.util");
function decodeRobotPosition(payload) {
  const stream = (0, _toStream.toStream)(payload);
  return {
    mapHeadId: (0, _stream.readWord)(stream),
    poseId: (0, _stream.readWord)(stream),
    update: (0, _stream.readByte)(stream),
    poseX: (0, _stream.readFloat)(stream),
    poseY: (0, _stream.readFloat)(stream),
    posePhi: (0, _stream.readFloat)(stream)
  };
}
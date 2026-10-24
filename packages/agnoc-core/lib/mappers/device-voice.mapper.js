"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DeviceVoiceMapper = void 0;
var _interpolate = require("../utils/interpolate.util");
var _deviceVoice = require("../value-objects/device-voice.value-object");
const ROBOT_MAX_VOLUME = 11;
const ROBOT_MIN_VOLUME = 1;
const ROBOT = {
  min: ROBOT_MIN_VOLUME,
  max: ROBOT_MAX_VOLUME
};
const DEVICE = {
  min: _deviceVoice.DeviceVoice.MIN_VOLUME,
  max: _deviceVoice.DeviceVoice.MAX_VOLUME
};
const DeviceVoiceMapper = class {
  static toDomain({
    isEnabled,
    volume
  }) {
    return new _deviceVoice.DeviceVoice({
      isEnabled,
      volume: (0, _interpolate.interpolate)(volume, ROBOT, DEVICE)
    });
  }
  static toRobot({
    isEnabled,
    volume
  }) {
    return {
      isEnabled,
      volume: Math.floor((0, _interpolate.interpolate)(volume, DEVICE, ROBOT))
    };
  }
};
exports.DeviceVoiceMapper = DeviceVoiceMapper;
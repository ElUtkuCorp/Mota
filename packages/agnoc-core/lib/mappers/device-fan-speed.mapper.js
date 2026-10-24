"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DeviceFanSpeedMapper = void 0;
var _flipObject = require("../utils/flip-object.util");
var _deviceFanSpeed = require("../value-objects/device-fan-speed.value-object");
const DOMAIN_TO_ROBOT = {
  [_deviceFanSpeed.DeviceFanSpeed.VALUE.OFF]: 0,
  [_deviceFanSpeed.DeviceFanSpeed.VALUE.LOW]: 1,
  [_deviceFanSpeed.DeviceFanSpeed.VALUE.MEDIUM]: 2,
  [_deviceFanSpeed.DeviceFanSpeed.VALUE.HIGH]: 3
};
const ROBOT_TO_DOMAIN = (0, _flipObject.flipObject)(DOMAIN_TO_ROBOT);
const DeviceFanSpeedMapper = class {
  static toDomain(fanSpeed) {
    return new _deviceFanSpeed.DeviceFanSpeed({
      value: ROBOT_TO_DOMAIN[fanSpeed]
    });
  }
  static toRobot(fanSpeed) {
    return DOMAIN_TO_ROBOT[fanSpeed.value];
  }
};
exports.DeviceFanSpeedMapper = DeviceFanSpeedMapper;
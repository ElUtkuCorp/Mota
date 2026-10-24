"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DeviceBatteryMapper = void 0;
var _interpolate = require("../utils/interpolate.util");
var _deviceBattery = require("../value-objects/device-battery.value-object");
const ROBOT_MAX_VALUE = 200;
const ROBOT_MIN_VALUE = 100;
const ROBOT = {
  min: ROBOT_MIN_VALUE,
  max: ROBOT_MAX_VALUE
};
const DEVICE = {
  min: _deviceBattery.DeviceBattery.MIN_VALUE,
  max: _deviceBattery.DeviceBattery.MAX_VALUE
};
const DeviceBatteryMapper = class {
  static toDomain(battery) {
    if (battery < ROBOT_MIN_VALUE) {
      battery = ROBOT_MIN_VALUE;
    }
    if (battery > ROBOT_MAX_VALUE) {
      battery = ROBOT_MAX_VALUE;
    }
    return new _deviceBattery.DeviceBattery({
      value: (0, _interpolate.interpolate)(battery, ROBOT, DEVICE)
    });
  }
  static toRobot(battery) {
    return Math.floor((0, _interpolate.interpolate)(battery.value, DEVICE, ROBOT));
  }
};
exports.DeviceBatteryMapper = DeviceBatteryMapper;
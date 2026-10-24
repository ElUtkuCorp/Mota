"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DeviceWaterLevelMapper = void 0;
var _flipObject = require("../utils/flip-object.util");
var _deviceWaterLevel = require("../value-objects/device-water-level.value-object");
const DOMAIN_TO_ROBOT = {
  [_deviceWaterLevel.DeviceWaterLevel.VALUE.OFF]: 10,
  [_deviceWaterLevel.DeviceWaterLevel.VALUE.LOW]: 11,
  [_deviceWaterLevel.DeviceWaterLevel.VALUE.MEDIUM]: 12,
  [_deviceWaterLevel.DeviceWaterLevel.VALUE.HIGH]: 13
};
const ROBOT_TO_DOMAIN = (0, _flipObject.flipObject)(DOMAIN_TO_ROBOT);
const DeviceWaterLevelMapper = class {
  static toDomain(waterLevel) {
    return new _deviceWaterLevel.DeviceWaterLevel({
      value: ROBOT_TO_DOMAIN[waterLevel]
    });
  }
  static toRobot(waterLevel) {
    return DOMAIN_TO_ROBOT[waterLevel.value];
  }
};
exports.DeviceWaterLevelMapper = DeviceWaterLevelMapper;
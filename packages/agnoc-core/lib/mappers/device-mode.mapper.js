"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DeviceModeMapper = void 0;
var _domain = require("../exceptions/domain.exception");
var _notImplemented = require("../exceptions/not-implemented.exception");
var _deviceMode = require("../value-objects/device-mode.value-object");
const {
  VALUE
} = _deviceMode.DeviceMode;
function getDomainValue(mode) {
  if ([0, 1, 2, 4, 5, 10, 11].includes(mode)) {
    return VALUE.NONE;
  }
  if ([30, 31, 32, 35].includes(mode)) {
    return VALUE.ZONE;
  }
  if ([7, 9, 12, 14].includes(mode)) {
    return VALUE.SPOT;
  }
  if ([36, 37, 38, 40].includes(mode)) {
    return VALUE.MOP;
  }
  // Mota: bordes y espiral (tabla de workMode de abajo en device-state.mapper.js)
  if ([25, 26, 27, 28, 29].includes(mode)) {
    return VALUE.EDGE;
  }
  if ([20, 21, 22, 23].includes(mode)) {
    return VALUE.SPIRAL;
  }
  // Mota: un modo desconocido no debe romper el procesado del estado del robot
  return VALUE.NONE;
}
const DeviceModeMapper = class {
  static toDomain(mode) {
    return new _deviceMode.DeviceMode({
      value: getDomainValue(mode)
    });
  }
  static toRobot() {
    throw new _notImplemented.NotImplementedException('DeviceModeMapper.toRobot');
  }
};
exports.DeviceModeMapper = DeviceModeMapper;
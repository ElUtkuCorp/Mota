"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DeviceStateMapper = void 0;
var _domain = require("../exceptions/domain.exception");
var _notImplemented = require("../exceptions/not-implemented.exception");
var _deviceState = require("../value-objects/device-state.value-object");
const {
  VALUE
} = _deviceState.DeviceState;
/*

Conga 5090 workMode codes, should be compatible with other congas.
+----------+--------------+----------------+
| workMode | ActivityMode |    workMode    |
+----------+--------------+----------------+
|        0 | Auto         | IDLE           |
|        1 | Auto         | CLEANING       |
|        2 | Manual       | MANUAL_CONTROL |
|        4 | Auto         | PAUSED         |
|        5 | Auto         | RETURNING      |
|        7 | Spot         | CLEANING       |
|        9 | Spot         | PAUSED         |
|       12 | Spot         | RETURNING      |
|       14 | Spot         | IDLE           |
|       20 | Spiral       | CLEANING       |
|       23 | Spiral       | IDLE           |
|       25 | Edge         | CLEANING       |
|       26 | Edge         | PAUSED         |
|       27 | Edge         | RETURNING      |
|       29 | Edge         | IDLE           |
|       30 | Area         | CLEANING       |
|       31 | Area         | PAUSED         |
|       32 | Area         | RETURNING      |
|       35 | Area         | IDLE           |
|       36 | Scrubbing    | CLEANING       |
|       37 | Scrubbing    | PAUSED         |
|       38 | Scrubbing    | RETURNING      |
|       40 | Scrubbing    | IDLE           |
+----------+--------------+----------------+

*/

function getDomainValue(state) {
  const {
    type,
    workMode,
    chargeStatus
  } = state;
  if (![0, 3].includes(type)) {
    return VALUE.ERROR;
  }
  if ([2].includes(workMode)) {
    return VALUE.MANUAL_CONTROL;
  }
  if ([5, 10, 12, 27, 32, 38].includes(workMode)) {
    return VALUE.RETURNING;
  }
  if ([4, 9, 26, 31, 37].includes(workMode)) {
    return VALUE.PAUSED;
  }
  if ([1, 6, 7, 11, 20, 25, 30, 36].includes(workMode)) {
    return VALUE.CLEANING;
  }
  if (chargeStatus) {
    return VALUE.DOCKED;
  }
  if ([0, 14, 23, 29, 35, 40].includes(workMode)) {
    return VALUE.IDLE;
  }
  // Mota: espiral y bordes volviendo a la base (22, 28) y cualquier modo desconocido
  if ([22, 28].includes(workMode)) {
    return VALUE.RETURNING;
  }
  return VALUE.IDLE;
}
const DeviceStateMapper = class {
  static toDomain(state) {
    return new _deviceState.DeviceState({
      value: getDomainValue(state)
    });
  }
  static toRobot() {
    throw new _notImplemented.NotImplementedException('DeviceStateMapper.toRobot');
  }
};
exports.DeviceStateMapper = DeviceStateMapper;
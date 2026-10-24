"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DeviceErrorMapper = void 0;
var _domain = require("../exceptions/domain.exception");
var _notImplemented = require("../exceptions/not-implemented.exception");
var _deviceError = require("../value-objects/device-error.value-object");
const ROBOT_TO_DOMAIN = {
  0: _deviceError.DeviceError.VALUE.NONE,
  2003: _deviceError.DeviceError.VALUE.LOW_POWER_PLAN_DIS,
  2100: _deviceError.DeviceError.VALUE.BROKEN_GO_HOME,
  2101: _deviceError.DeviceError.VALUE.NONE,
  2102: _deviceError.DeviceError.VALUE.NONE,
  2103: _deviceError.DeviceError.VALUE.NONE,
  2104: _deviceError.DeviceError.VALUE.NONE,
  2105: _deviceError.DeviceError.VALUE.NONE,
  2106: _deviceError.DeviceError.VALUE.NONE,
  2107: _deviceError.DeviceError.VALUE.GLOBAL_APPOINT_CLEAN,
  2108: _deviceError.DeviceError.VALUE.ROBOT_RELOCALITION_ING,
  2109: _deviceError.DeviceError.VALUE.ROBOT_REPEAT_CLEANING,
  2110: _deviceError.DeviceError.VALUE.ROBOT_SELF_CHECKING,
  2200: _deviceError.DeviceError.VALUE.NONE,
  2203: _deviceError.DeviceError.VALUE.NONE,
  500: _deviceError.DeviceError.VALUE.LIDAR_TIME_OUT,
  501: _deviceError.DeviceError.VALUE.WHEEL_UP,
  502: _deviceError.DeviceError.VALUE.LOW_START_BATTERY,
  503: _deviceError.DeviceError.VALUE.DUSTBOX_NOT_EXIST,
  504: _deviceError.DeviceError.VALUE.GEOMAGETISM_STRUCT,
  505: _deviceError.DeviceError.VALUE.START_DOCK_FAILED,
  506: _deviceError.DeviceError.VALUE.FOLLOWE_IR_EXCEPTION,
  507: _deviceError.DeviceError.VALUE.RELOCALIZATION_FAILED,
  508: _deviceError.DeviceError.VALUE.SLOPE_START_FAILED,
  509: _deviceError.DeviceError.VALUE.CLIFF_IR_STRUCT,
  510: _deviceError.DeviceError.VALUE.BUMPER_STRUCT,
  511: _deviceError.DeviceError.VALUE.GO_DOCK_FAILED,
  512: _deviceError.DeviceError.VALUE.PUT_MACHINE_DOCK,
  513: _deviceError.DeviceError.VALUE.ESCAPE_FAILED,
  514: _deviceError.DeviceError.VALUE.ESCAPE_FAILED,
  515: _deviceError.DeviceError.VALUE.DOCK_CLIP_EXCEPTION,
  516: _deviceError.DeviceError.VALUE.BATTERY_TEMPERATURE,
  517: _deviceError.DeviceError.VALUE.SYSTEM_UPGRADE,
  518: _deviceError.DeviceError.VALUE.WAIT_CHARGE_FINISH,
  519: _deviceError.DeviceError.VALUE.ROLL_BRUSH_STALL,
  520: _deviceError.DeviceError.VALUE.SIDE_BRUSH_STALL,
  521: _deviceError.DeviceError.VALUE.WATER_BOX_NOT_EXIST,
  522: _deviceError.DeviceError.VALUE.MOPPING_NOT_EXIST,
  523: _deviceError.DeviceError.VALUE.HANDPPEN_DUST_BOX_FULL,
  525: _deviceError.DeviceError.VALUE.WATER_TRUNK_EMPTY,
  526: _deviceError.DeviceError.VALUE.DISHCLOTH_DIRTY,
  527: _deviceError.DeviceError.VALUE.DUST_BOX_FULL
};
const DeviceErrorMapper = class {
  static toDomain(error) {
    if (!(error in ROBOT_TO_DOMAIN)) {
      // Mota: no lanzar con códigos desconocidos; se rompía el procesado del estado del robot
      return new _deviceError.DeviceError({
        value: _deviceError.DeviceError.VALUE.UNKNOWN
      });
    }
    const value = ROBOT_TO_DOMAIN[error];

    // @ts-expect-error unknown error
    return new _deviceError.DeviceError({
      value
    });
  }
  static toRobot() {
    throw new _notImplemented.NotImplementedException('DeviceErrorMapper.toRobot');
  }
};
exports.DeviceErrorMapper = DeviceErrorMapper;
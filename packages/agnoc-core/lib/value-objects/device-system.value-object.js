"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MODEL_CAPABILITY = exports.DeviceSystem = exports.DEVICE_TYPE = exports.DEVICE_MODEL = exports.DEVICE_CAPABILITY = void 0;
var _valueObject = require("../base-classes/value-object.base");
var _argumentNotProvided = require("../exceptions/argument-not-provided.exception");
var _isPresent = require("../utils/is-present.util");
const DEVICE_MODEL = {
  C3090: 'C3090',
  C3490: 'C3490',
  UNKNOWN: 'unknown'
};
exports.DEVICE_MODEL = DEVICE_MODEL;
const DEVICE_TYPE = {
  3: DEVICE_MODEL.C3090,
  9: DEVICE_MODEL.C3490
};
exports.DEVICE_TYPE = DEVICE_TYPE;
const DEVICE_CAPABILITY = {
  MAP_PLANS: 0x0001,
  WATER_SENSOR: 0x0002,
  CONSUMABLES: 0x0004
};
exports.DEVICE_CAPABILITY = DEVICE_CAPABILITY;
const MODEL_CAPABILITY = {
  [DEVICE_MODEL.C3090]: 0,
  [DEVICE_MODEL.C3490]: DEVICE_CAPABILITY.MAP_PLANS | DEVICE_CAPABILITY.WATER_SENSOR | DEVICE_CAPABILITY.CONSUMABLES,
  [DEVICE_MODEL.UNKNOWN]: DEVICE_CAPABILITY.MAP_PLANS | DEVICE_CAPABILITY.WATER_SENSOR | DEVICE_CAPABILITY.CONSUMABLES
};
exports.MODEL_CAPABILITY = MODEL_CAPABILITY;
class DeviceSystem extends _valueObject.ValueObject {
  get model() {
    return DEVICE_TYPE[this.props.deviceType] || DEVICE_MODEL.UNKNOWN;
  }
  get capabilities() {
    return MODEL_CAPABILITY[this.model];
  }
  supports(capability) {
    return Boolean(this.capabilities & capability);
  }
  validate(props) {
    if (![props.deviceSerialNumber, props.deviceMac, props.deviceType, props.customerFirmwareId, props.ctrlVersion].every(_isPresent.isPresent)) {
      throw new _argumentNotProvided.ArgumentNotProvidedException('Missing property in device system constructor');
    }
  }
}
exports.DeviceSystem = DeviceSystem;
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DeviceMode = void 0;
var _valueObject = require("../base-classes/value-object.base");
var _argumentInvalid = require("../exceptions/argument-invalid.exception");
var _argumentNotProvided = require("../exceptions/argument-not-provided.exception");
var _isPresent = require("../utils/is-present.util");
const VALUE = {
  NONE: 'none',
  SPOT: 'spot',
  ZONE: 'zone',
  MOP: 'mop',
  // Mota: modos que la 3090 soporta y agnoc no conocía
  EDGE: 'edge',
  SPIRAL: 'spiral'
};
class DeviceMode extends _valueObject.ValueObject {
  get value() {
    return this.props.value;
  }
  validate(props) {
    if (![props.value].every(_isPresent.isPresent)) {
      throw new _argumentNotProvided.ArgumentNotProvidedException('Missing property in device mode constructor');
    }
    if (!Object.values(VALUE).includes(props.value)) {
      throw new _argumentInvalid.ArgumentInvalidException('Invalid property in device mode constructor');
    }
  }
}
exports.DeviceMode = DeviceMode;
DeviceMode.VALUE = VALUE;
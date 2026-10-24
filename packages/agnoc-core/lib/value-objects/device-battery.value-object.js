"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DeviceBattery = void 0;
var _valueObject = require("../base-classes/value-object.base");
var _argumentInvalid = require("../exceptions/argument-invalid.exception");
var _argumentNotProvided = require("../exceptions/argument-not-provided.exception");
var _isPresent = require("../utils/is-present.util");
const MIN_VALUE = 0;
const MAX_VALUE = 100;
class DeviceBattery extends _valueObject.ValueObject {
  get value() {
    return this.props.value;
  }
  validate(props) {
    if (![props.value].every(_isPresent.isPresent)) {
      throw new _argumentNotProvided.ArgumentNotProvidedException('Missing property in device fan speed constructor');
    }
    if (props.value < MIN_VALUE || props.value > MAX_VALUE) {
      throw new _argumentInvalid.ArgumentInvalidException('Invalid property in device battery constructor');
    }
  }
}
exports.DeviceBattery = DeviceBattery;
DeviceBattery.MIN_VALUE = MIN_VALUE;
DeviceBattery.MAX_VALUE = MAX_VALUE;
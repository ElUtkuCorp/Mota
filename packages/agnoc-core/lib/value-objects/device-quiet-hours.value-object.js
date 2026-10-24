"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DeviceQuietHours = void 0;
var _valueObject = require("../base-classes/value-object.base");
var _argumentInvalid = require("../exceptions/argument-invalid.exception");
var _argumentNotProvided = require("../exceptions/argument-not-provided.exception");
var _isPresent = require("../utils/is-present.util");
var _deviceTime = require("./device-time.value-object");
class DeviceQuietHours extends _valueObject.ValueObject {
  get isEnabled() {
    return this.props.isEnabled;
  }
  get begin() {
    return this.props.begin;
  }
  get end() {
    return this.props.end;
  }
  validate(props) {
    if (![props.isEnabled, props.begin, props.end].every(_isPresent.isPresent)) {
      throw new _argumentNotProvided.ArgumentNotProvidedException('Missing property in device quiet hours constructor');
    }
    if (!(props.begin instanceof _deviceTime.DeviceTime)) {
      throw new _argumentInvalid.ArgumentInvalidException('Invalid property begin in device quiet hours constructor');
    }
  }
}
exports.DeviceQuietHours = DeviceQuietHours;
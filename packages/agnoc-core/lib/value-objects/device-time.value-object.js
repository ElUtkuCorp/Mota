"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DeviceTime = void 0;
var _valueObject = require("../base-classes/value-object.base");
var _argumentNotProvided = require("../exceptions/argument-not-provided.exception");
var _isPresent = require("../utils/is-present.util");
class DeviceTime extends _valueObject.ValueObject {
  get hour() {
    return this.props.hour;
  }
  get minute() {
    return this.props.minute;
  }
  toMinutes() {
    return this.props.hour * 60 + this.props.minute;
  }
  static fromMinutes(minutes) {
    return new DeviceTime({
      hour: Math.floor(minutes / 60),
      minute: minutes % 60
    });
  }
  validate(props) {
    if (![props.hour, props.minute].every(_isPresent.isPresent)) {
      throw new _argumentNotProvided.ArgumentNotProvidedException('Missing property in device time constructor');
    }
  }
}
exports.DeviceTime = DeviceTime;
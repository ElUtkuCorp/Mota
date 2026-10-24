"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DeviceVoice = void 0;
var _valueObject = require("../base-classes/value-object.base");
var _argumentInvalid = require("../exceptions/argument-invalid.exception");
var _argumentNotProvided = require("../exceptions/argument-not-provided.exception");
var _isPresent = require("../utils/is-present.util");
const MIN_VOLUME = 0;
const MAX_VOLUME = 100;
class DeviceVoice extends _valueObject.ValueObject {
  get isEnabled() {
    return this.props.isEnabled;
  }
  get volume() {
    return this.props.volume;
  }
  validate(props) {
    if (![props.isEnabled, props.volume].every(_isPresent.isPresent)) {
      throw new _argumentNotProvided.ArgumentNotProvidedException('Missing property in device voice constructor');
    }
    if (props.volume < MIN_VOLUME || props.volume > MAX_VOLUME) {
      throw new _argumentInvalid.ArgumentInvalidException('Invalid property in device voice constructor');
    }
  }
}
exports.DeviceVoice = DeviceVoice;
DeviceVoice.MIN_VOLUME = MIN_VOLUME;
DeviceVoice.MAX_VOLUME = MAX_VOLUME;
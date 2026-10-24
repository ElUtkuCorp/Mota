"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DeviceConfig = void 0;
var _valueObject = require("../base-classes/value-object.base");
var _argumentInvalid = require("../exceptions/argument-invalid.exception");
var _argumentNotProvided = require("../exceptions/argument-not-provided.exception");
var _isPresent = require("../utils/is-present.util");
var _deviceQuietHours = require("./device-quiet-hours.value-object");
class DeviceConfig extends _valueObject.ValueObject {
  get voice() {
    return this.props.voice;
  }
  get quietHours() {
    return this.props.quietHours;
  }
  get isEcoModeEnabled() {
    return this.props.isEcoModeEnabled;
  }
  get isRepeatCleanEnabled() {
    return this.props.isRepeatCleanEnabled;
  }
  get isBrokenCleanEnabled() {
    return this.props.isBrokenCleanEnabled;
  }
  get isCarpetModeEnabled() {
    return this.props.isCarpetModeEnabled;
  }
  get isHistoryMapEnabled() {
    return this.props.isHistoryMapEnabled;
  }
  updateVoice(voice) {
    this.props.voice = voice;
  }
  updateCarpetMode(enable) {
    this.props.isCarpetModeEnabled = enable;
  }
  updateQuietHours(quietHours) {
    this.props.quietHours = quietHours;
  }
  updateHistoryMap(enable) {
    this.props.isHistoryMapEnabled = enable;
  }
  validate(props) {
    if (![props.voice.isEnabled, props.voice.volume, props.quietHours, props.isEcoModeEnabled, props.isRepeatCleanEnabled, props.isBrokenCleanEnabled, props.isCarpetModeEnabled, props.isHistoryMapEnabled, props.isBrokenCleanEnabled, props.isCarpetModeEnabled, props.isHistoryMapEnabled].every(_isPresent.isPresent)) {
      throw new _argumentNotProvided.ArgumentNotProvidedException('Missing property in device config constructor');
    }
    if (!(props.quietHours instanceof _deviceQuietHours.DeviceQuietHours)) {
      throw new _argumentInvalid.ArgumentInvalidException('Invalid property quiet hours in device config constructor');
    }
  }
}
exports.DeviceConfig = DeviceConfig;
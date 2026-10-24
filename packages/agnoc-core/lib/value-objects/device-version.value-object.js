"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DeviceVersion = void 0;
var _valueObject = require("../base-classes/value-object.base");
var _argumentNotProvided = require("../exceptions/argument-not-provided.exception");
var _isPresent = require("../utils/is-present.util");
class DeviceVersion extends _valueObject.ValueObject {
  get software() {
    return this.props.software;
  }
  get hardware() {
    return this.props.hardware;
  }
  validate(props) {
    if (![props.software, props.hardware].every(_isPresent.isPresent)) {
      throw new _argumentNotProvided.ArgumentNotProvidedException('Missing property in device current clean constructor');
    }
  }
}
exports.DeviceVersion = DeviceVersion;
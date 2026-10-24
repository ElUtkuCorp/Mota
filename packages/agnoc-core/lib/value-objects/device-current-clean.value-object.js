"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DeviceCurrentClean = void 0;
var _valueObject = require("../base-classes/value-object.base");
var _argumentNotProvided = require("../exceptions/argument-not-provided.exception");
var _isPresent = require("../utils/is-present.util");
class DeviceCurrentClean extends _valueObject.ValueObject {
  get size() {
    return this.props.size;
  }
  get time() {
    return this.props.time;
  }
  validate(props) {
    if (![props.size, props.time].every(_isPresent.isPresent)) {
      throw new _argumentNotProvided.ArgumentNotProvidedException('Missing property in device current clean constructor');
    }
  }
}
exports.DeviceCurrentClean = DeviceCurrentClean;
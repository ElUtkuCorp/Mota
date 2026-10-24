"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Pixel = void 0;
var _valueObject = require("../base-classes/value-object.base");
var _argumentInvalid = require("../exceptions/argument-invalid.exception");
var _argumentNotProvided = require("../exceptions/argument-not-provided.exception");
var _isPresent = require("../utils/is-present.util");
class Pixel extends _valueObject.ValueObject {
  get x() {
    return this.props.x;
  }
  get y() {
    return this.props.y;
  }
  validate(props) {
    if (![props.x, props.y].every(_isPresent.isPresent)) {
      throw new _argumentNotProvided.ArgumentNotProvidedException('Missing property in pixel constructor');
    }
    if (![props.x, props.y].every(prop => Number.isInteger(prop) && prop >= 0)) {
      throw new _argumentInvalid.ArgumentInvalidException('Invalid property in pixel constructor');
    }
  }
}
exports.Pixel = Pixel;
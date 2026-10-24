"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Coordinate = void 0;
var _valueObject = require("../base-classes/value-object.base");
var _argumentNotProvided = require("../exceptions/argument-not-provided.exception");
var _isPresent = require("../utils/is-present.util");
class Coordinate extends _valueObject.ValueObject {
  get x() {
    return this.props.x;
  }
  get y() {
    return this.props.y;
  }
  validate(props) {
    if (![props.x, props.y].every(_isPresent.isPresent)) {
      throw new _argumentNotProvided.ArgumentNotProvidedException('Missing property in coordinate constructor');
    }
  }
}
exports.Coordinate = Coordinate;
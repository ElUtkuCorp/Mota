"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Position = void 0;
var _valueObject = require("../base-classes/value-object.base");
var _argumentNotProvided = require("../exceptions/argument-not-provided.exception");
var _isPresent = require("../utils/is-present.util");
var _coordinate = require("./coordinate.value-object");
class Position extends _valueObject.ValueObject {
  get x() {
    return this.props.x;
  }
  get y() {
    return this.props.y;
  }
  get phi() {
    return this.props.phi;
  }
  get degrees() {
    return (this.phi + Math.PI) * 180.0 / Math.PI - 90.0;
  }
  toCoordinates() {
    return new _coordinate.Coordinate({
      x: this.x,
      y: this.y
    });
  }
  validate(props) {
    if (![props.x, props.y, props.phi].every(_isPresent.isPresent)) {
      throw new _argumentNotProvided.ArgumentNotProvidedException('Missing property in position constructor');
    }
  }
}
exports.Position = Position;
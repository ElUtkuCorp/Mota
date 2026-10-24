"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Room = void 0;
var _entity = require("../base-classes/entity.base");
var _argumentInvalid = require("../exceptions/argument-invalid.exception");
var _argumentNotProvided = require("../exceptions/argument-not-provided.exception");
var _isPresent = require("../utils/is-present.util");
var _coordinate = require("../value-objects/coordinate.value-object");
var _id = require("../value-objects/id.value-object");
class Room extends _entity.Entity {
  constructor(props) {
    super(props);
    this.validate(props);
  }
  get id() {
    return this.props.id;
  }
  get name() {
    return this.props.name;
  }
  get isEnabled() {
    return this.props.isEnabled;
  }
  get center() {
    return this.props.center;
  }
  get pixels() {
    return this.props.pixels;
  }
  validate(props) {
    if (![props.id, props.name, props.isEnabled, props.center, props.pixels].every(_isPresent.isPresent)) {
      throw new _argumentNotProvided.ArgumentNotProvidedException('Missing property in room constructor');
    }
    if (!(props.id instanceof _id.ID)) {
      throw new _argumentInvalid.ArgumentInvalidException('Invalid id in room constructor');
    }
    if (!(props.center instanceof _coordinate.Coordinate)) {
      throw new _argumentInvalid.ArgumentInvalidException('Invalid center in room constructor');
    }
    if (!Array.isArray(props.pixels)) {
      throw new _argumentInvalid.ArgumentInvalidException('Invalid pixels in room constructor');
    }
  }
}
exports.Room = Room;
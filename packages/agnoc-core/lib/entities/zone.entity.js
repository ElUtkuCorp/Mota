"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Zone = void 0;
var _entity = require("../base-classes/entity.base");
var _argumentInvalid = require("../exceptions/argument-invalid.exception");
var _argumentNotProvided = require("../exceptions/argument-not-provided.exception");
var _isPresent = require("../utils/is-present.util");
var _id = require("../value-objects/id.value-object");
class Zone extends _entity.Entity {
  constructor(props) {
    super(props);
    this.validate(props);
  }
  get id() {
    return this.props.id;
  }
  get coordinates() {
    return this.props.coordinates;
  }
  validate(props) {
    if (![props.id, props.coordinates].every(_isPresent.isPresent)) {
      throw new _argumentNotProvided.ArgumentNotProvidedException('Missing property in zone constructor');
    }
    if (!(props.id instanceof _id.ID)) {
      throw new _argumentInvalid.ArgumentInvalidException('Invalid id in zone constructor');
    }
    if (!Array.isArray(props.coordinates)) {
      throw new _argumentInvalid.ArgumentInvalidException('Invalid coordinate in zone constructor');
    }
  }
}
exports.Zone = Zone;
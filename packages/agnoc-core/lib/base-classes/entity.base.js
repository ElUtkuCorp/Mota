"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Entity = void 0;
var _argumentInvalid = require("../exceptions/argument-invalid.exception");
var _argumentNotProvided = require("../exceptions/argument-not-provided.exception");
var _convertPropsToObject = require("../utils/convert-props-to-object.util");
var _isObject = require("../utils/is-object.util");
var _isPresent = require("../utils/is-present.util");
var _id = require("../value-objects/id.value-object");
class Entity {
  constructor(props) {
    this.props = void 0;
    this.validateProps(props);
    this.props = props;
  }
  get id() {
    return this.props.id;
  }
  static isEntity(entity) {
    return entity instanceof Entity;
  }
  equals(object) {
    if (!(0, _isPresent.isPresent)(object)) {
      return false;
    }
    if (this === object) {
      return true;
    }
    if (!Entity.isEntity(object)) {
      return false;
    }
    return this.id.equals(object.id);
  }
  clone(props) {
    const ctor = this.constructor;
    return new ctor({
      ...this.props,
      ...props
    });
  }
  toJSON() {
    const propsCopy = (0, _convertPropsToObject.convertPropsToObject)(this.props);
    return Object.freeze(propsCopy);
  }
  toString() {
    return JSON.stringify(this.toJSON());
  }
  validateProps(props) {
    if (!(0, _isObject.isObject)(props)) {
      throw new _argumentInvalid.ArgumentInvalidException('Entity props should be an object');
    }
    if (!props.id) {
      throw new _argumentNotProvided.ArgumentNotProvidedException('Entity props must have an id');
    }
    if (!(props.id instanceof _id.ID)) {
      throw new _argumentInvalid.ArgumentInvalidException('Entity id must a valid ID object');
    }
  }
}
exports.Entity = Entity;
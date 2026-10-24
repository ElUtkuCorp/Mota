"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ValueObject = void 0;
var _argumentNotProvided = require("../exceptions/argument-not-provided.exception");
var _convertPropsToObject = require("../utils/convert-props-to-object.util");
var _isEmpty = require("../utils/is-empty.util");
var _isPresent = require("../utils/is-present.util");
class ValueObject {
  constructor(props) {
    this.props = void 0;
    this.checkIfEmpty(props);
    this.validate(props);
    this.props = props;
  }
  equals(vo) {
    if (!(0, _isPresent.isPresent)(vo)) {
      return false;
    }
    return JSON.stringify(this) === JSON.stringify(vo);
  }
  toString() {
    if (this.isDomainPrimitive(this.props)) {
      return String(this.props.value);
    }
    return JSON.stringify(this.toJSON());
  }
  toJSON() {
    if (this.isDomainPrimitive(this.props)) {
      return this.props.value;
    }
    const propsCopy = (0, _convertPropsToObject.convertPropsToObject)(this.props);
    return Object.freeze(propsCopy);
  }
  clone(props) {
    const ctor = this.constructor;
    return new ctor({
      ...this.props,
      ...props
    });
  }
  checkIfEmpty(props) {
    if ((0, _isEmpty.isEmpty)(props) || this.isDomainPrimitive(props) && (0, _isEmpty.isEmpty)(props.value)) {
      throw new _argumentNotProvided.ArgumentNotProvidedException('Property cannot be empty');
    }
  }
  isDomainPrimitive(obj) {
    if (Object.prototype.hasOwnProperty.call(obj, 'value')) {
      return true;
    }
    return false;
  }
  static isValueObject(obj) {
    return obj instanceof ValueObject;
  }
}
exports.ValueObject = ValueObject;
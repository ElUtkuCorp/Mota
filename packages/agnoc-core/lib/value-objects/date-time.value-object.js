"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DateTime = void 0;
var _valueObject = require("../base-classes/value-object.base");
var _argumentInvalid = require("../exceptions/argument-invalid.exception");
class DateTime extends _valueObject.ValueObject {
  constructor(value) {
    const date = new Date(value);
    super({
      value: date
    });
  }
  get value() {
    return this.props.value;
  }
  toString() {
    return this.value.toISOString();
  }
  static now() {
    return new DateTime(Date.now());
  }
  validate({
    value
  }) {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
      throw new _argumentInvalid.ArgumentInvalidException('Incorrect date');
    }
  }
}
exports.DateTime = DateTime;
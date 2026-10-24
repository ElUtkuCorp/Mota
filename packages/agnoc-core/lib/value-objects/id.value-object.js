"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ID = void 0;
var _crypto = require("crypto");
var _valueObject = require("../base-classes/value-object.base");
var _argumentInvalid = require("../exceptions/argument-invalid.exception");
class ID extends _valueObject.ValueObject {
  constructor(value) {
    super({
      value
    });
  }
  get value() {
    return this.props.value;
  }
  validate({
    value
  }) {
    if (typeof value !== 'number') {
      throw new _argumentInvalid.ArgumentInvalidException('Incorrect ID value');
    }
  }
  static generate() {
    const uint32 = (0, _crypto.randomBytes)(2).toString('hex');
    const id = parseInt(uint32, 16);
    return new ID(id);
  }
  static fromJSON(value) {
    return new ID(value);
  }
}
exports.ID = ID;
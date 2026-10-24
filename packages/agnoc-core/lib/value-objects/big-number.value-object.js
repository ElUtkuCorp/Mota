"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BigNumber = void 0;
var _crypto = require("crypto");
var _valueObject = require("../base-classes/value-object.base");
var _argumentInvalid = require("../exceptions/argument-invalid.exception");
class BigNumber extends _valueObject.ValueObject {
  constructor(value) {
    super({
      value
    });
  }
  get value() {
    return this.props.value;
  }
  toString() {
    return this.props.value.toString(16);
  }
  toJSON() {
    return this.toString();
  }
  validate(props) {
    if (typeof props.value !== 'bigint') {
      throw new _argumentInvalid.ArgumentInvalidException('Invalid bigint');
    }
  }
  static generate() {
    const str = (0, _crypto.randomBytes)(8).toString('hex');
    const value = BigInt(`0x${str}`);
    return new BigNumber(value);
  }
  static fromJSON(str) {
    const value = BigInt(`0x${str}`);
    return new BigNumber(value);
  }
  static fromString(str) {
    const value = BigInt(`0x${str}`);
    return new BigNumber(value);
  }
}
exports.BigNumber = BigNumber;
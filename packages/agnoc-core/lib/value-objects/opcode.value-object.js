"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.OPCode = void 0;
var _valueObject = require("../base-classes/value-object.base");
var _opcodes = require("../constants/opcodes.constant");
var _argumentInvalid = require("../exceptions/argument-invalid.exception");
var _argumentOutOfRange = require("../exceptions/argument-out-of-range.exception");
const MIN_OPCODE = 0;
const MAX_OPCODE = 0xffff;
function toHex(value) {
  return `0x${value.toString(16).padStart(4, '0')}`;
}
class OPCode extends _valueObject.ValueObject {
  constructor(value) {
    super({
      value
    });
  }
  get value() {
    return this.props.value;
  }
  get code() {
    return toHex(this.props.value);
  }
  get name() {
    return _opcodes.OPNAMES[this.value];
  }
  toString() {
    return this.name;
  }
  toJSON() {
    return this.name;
  }
  validate({
    value
  }) {
    if (value < MIN_OPCODE || value > MAX_OPCODE) {
      throw new _argumentOutOfRange.ArgumentOutOfRangeException(`Wrong opcode value '${toHex(value)}'`);
    }
    if (!(value in _opcodes.OPNAMES)) {
      throw new _argumentInvalid.ArgumentInvalidException(`Unrecognized opcode value '${toHex(value)}'`);
    }
  }
  static fromCode(code) {
    if (typeof code === 'string') {
      code = Number(code);
    }
    return new OPCode(code);
  }
  static fromName(name) {
    if (!(name in _opcodes.OPCODES)) {
      throw new _argumentInvalid.ArgumentInvalidException(`Invalid opcode with name '${name}'`);
    }
    const code = _opcodes.OPCODES[name];
    return new OPCode(code);
  }
}
exports.OPCode = OPCode;
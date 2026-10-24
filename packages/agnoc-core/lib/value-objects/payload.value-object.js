"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Payload = void 0;
var _light = _interopRequireDefault(require("protobufjs/light"));
var _schema = _interopRequireDefault(require("../../schemas/schema.json"));
var _valueObject = require("../base-classes/value-object.base");
var _area = require("../decoders/area.decoder");
var _chargePosition = require("../decoders/charge-position.decoder");
var _map = require("../decoders/map.decoder");
var _robotPosition = require("../decoders/robot-position.decoder");
var _argumentInvalid = require("../exceptions/argument-invalid.exception");
var _hasKey = require("../utils/has-key.util");
var _isObject = require("../utils/is-object.util");
var _opcode = require("./opcode.value-object");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const root = _light.default.Root.fromJSON(_schema.default);
const decoders = {
  DEVICE_MAPID_PUSH_POSITION_INFO: _robotPosition.decodeRobotPosition,
  DEVICE_MAPID_PUSH_CHARGE_POSITION_INFO: _chargePosition.decodeChargePosition,
  DEVICE_MAPID_GET_GLOBAL_INFO_RSP: _map.decodeMap,
  DEVICE_MAPID_PUSH_MAP_INFO: _map.decodeMap,
  DEVICE_MAPID_PUSH_ALL_MEMORY_MAP_INFO: _area.decodeArea
};
function fromObject(opcode, object) {
  if (!object) {
    return Buffer.alloc(0);
  }
  if (!opcode.name || !(0, _hasKey.hasKey)(root, opcode.name)) {
    throw new _argumentInvalid.ArgumentInvalidException(`Unable to create payload from unknown opcode ${opcode.toString()} from object ${JSON.stringify(object)}`);
  }
  const schema = root.lookupType(opcode.name);
  const err = schema.verify(object);
  if (err) {
    throw new _argumentInvalid.ArgumentInvalidException(`Unable to create payload from object: ${err}`);
  }
  const message = schema.create(object);
  return Buffer.from(schema.encode(message).finish());
}
function fromBuffer(opcode, buffer) {
  if (!opcode.name) {
    throw new _argumentInvalid.ArgumentInvalidException(`Unable to create payload from unknown opcode ${opcode.toString()} from buffer ${buffer.toString('hex')}`);
  }
  if ((0, _hasKey.hasKey)(decoders, opcode.name)) {
    const decoder = decoders[opcode.name];
    return decoder(buffer);
  }
  if ((0, _hasKey.hasKey)(root, opcode.name)) {
    const schema = root.lookupType(opcode.name);
    const message = schema.decode(buffer);
    return schema.toObject(message);
  }
  throw new _argumentInvalid.ArgumentInvalidException(`Unable to find decoder for opcode ${opcode.toString()} with buffer ${buffer.toString('hex')}`);
}
function filterProperties(_, value) {
  if ((0, _isObject.isObject)(value) && value.type === 'Buffer') {
    return '[Buffer]';
  }
  return value;
}
class Payload extends _valueObject.ValueObject {
  constructor({
    opcode,
    buffer,
    object
  }) {
    super({
      opcode,
      buffer,
      object
    });
  }
  get opcode() {
    return this.props.opcode;
  }
  get buffer() {
    return this.props.buffer;
  }
  get object() {
    return this.props.object;
  }
  toString() {
    return JSON.stringify(this.object, filterProperties);
  }
  toJSON() {
    return {
      opcode: this.props.opcode.toJSON(),
      object: this.props.object
    };
  }
  validate(props) {
    if (!(props.opcode instanceof _opcode.OPCode)) {
      throw new _argumentInvalid.ArgumentInvalidException('Wrong opcode in payload constructor');
    }
  }
  static fromJSON(obj) {
    const opcode = _opcode.OPCode.fromName(obj.opcode);
    return this.fromObject(opcode, obj.object);
  }
  static fromBuffer(opcode, buffer) {
    const object = fromBuffer(opcode, buffer);
    return new Payload({
      opcode,
      buffer,
      object
    });
  }
  static fromObject(opcode, object) {
    const buffer = fromObject(opcode, object);
    return new Payload({
      opcode,
      buffer,
      object
    });
  }
}
exports.Payload = Payload;
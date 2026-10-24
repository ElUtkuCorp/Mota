"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Packet = void 0;
exports.pack = pack;
exports.unpack = unpack;
var _assert = _interopRequireDefault(require("assert"));
var _valueObject = require("../base-classes/value-object.base");
var _argumentInvalid = require("../exceptions/argument-invalid.exception");
var _argumentNotProvided = require("../exceptions/argument-not-provided.exception");
var _bufferWriter = require("../streams/buffer-writer.stream");
var _isPresent = require("../utils/is-present.util");
var _stream = require("../utils/stream.util");
var _toStream = require("../utils/to-stream.util");
var _bigNumber = require("./big-number.value-object");
var _id = require("./id.value-object");
var _opcode = require("./opcode.value-object");
var _payload = require("./payload.value-object");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function unpack(data) {
  const stream = (0, _toStream.toStream)(data);
  const size = (0, _stream.readWord)(stream);
  (0, _assert.default)(data.length >= size, 'unpack: missing data');
  const ctype = (0, _stream.readByte)(stream);
  const flow = (0, _stream.readByte)(stream);
  const deviceId = new _id.ID((0, _stream.readWord)(stream));
  const userId = new _id.ID((0, _stream.readWord)(stream));
  const sequence = new _bigNumber.BigNumber((0, _stream.readLong)(stream));
  const opcode = _opcode.OPCode.fromCode((0, _stream.readShort)(stream));
  const payload = _payload.Payload.fromBuffer(opcode, size > 24 ? stream.read(size - 24) : Buffer.alloc(0));
  return {
    ctype,
    flow,
    deviceId,
    userId,
    sequence,
    payload
  };
}
function pack(packet) {
  var _packet$payload;
  const size = 24 + Number((_packet$payload = packet.payload) === null || _packet$payload === void 0 ? void 0 : _packet$payload.buffer.length);
  const stream = new _bufferWriter.BufferWriter();
  (0, _stream.writeWord)(stream, size);
  (0, _stream.writeByte)(stream, packet.ctype);
  (0, _stream.writeByte)(stream, packet.flow);
  (0, _stream.writeWord)(stream, packet.deviceId.value);
  (0, _stream.writeWord)(stream, packet.userId.value);
  (0, _stream.writeLong)(stream, packet.sequence.value);
  (0, _stream.writeShort)(stream, packet.payload.opcode.value);
  stream.write(packet.payload.buffer);
  return stream.buffer;
}
class Packet extends _valueObject.ValueObject {
  get ctype() {
    return this.props.ctype;
  }
  get flow() {
    return this.props.flow;
  }
  get userId() {
    return this.props.userId;
  }
  get deviceId() {
    return this.props.deviceId;
  }
  get sequence() {
    return this.props.sequence;
  }
  get payload() {
    return this.props.payload;
  }
  toBuffer() {
    return pack(this.props);
  }
  toString() {
    return [`[id: ${this.props.sequence.toString()}]`, `[ctype: ${this.props.ctype}]`, `[flow: ${this.props.flow}]`, `[userId: ${this.props.userId.toString()}]`, `[deviceId: ${this.props.deviceId.toString()}]`, `[opcode: ${this.props.payload.opcode.toString()}]`, this.props.payload.toString()].join(' ');
  }
  toJSON() {
    return super.toJSON();
  }
  validate(props) {
    if (![props.ctype, props.flow, props.userId, props.deviceId, props.sequence, props.payload].every(_isPresent.isPresent)) {
      throw new _argumentNotProvided.ArgumentNotProvidedException('Missing property in packet constructor');
    }
    if (!(props.sequence instanceof _bigNumber.BigNumber)) {
      throw new _argumentInvalid.ArgumentInvalidException('Invalid sequence in packet constructor');
    }
    if ((0, _isPresent.isPresent)(props.payload) && !(props.payload instanceof _payload.Payload)) {
      throw new _argumentInvalid.ArgumentInvalidException('Invalid payload in packet constructor');
    }
  }
  static fromBuffer(buffer) {
    return new Packet(unpack(buffer));
  }
  static fromJSON(serialized) {
    const props = {
      ctype: serialized.ctype,
      flow: serialized.flow,
      deviceId: _id.ID.fromJSON(serialized.deviceId),
      userId: _id.ID.fromJSON(serialized.userId),
      sequence: _bigNumber.BigNumber.fromJSON(serialized.sequence),
      payload: _payload.Payload.fromJSON(serialized.payload)
    };
    return new Packet(props);
  }
}
exports.Packet = Packet;
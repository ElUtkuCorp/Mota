"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.readShort = exports.readLong = exports.readFloat = exports.readByte = void 0;
exports.readString = readString;
exports.writeShort = exports.writeLong = exports.writeFloat = exports.writeByte = exports.readWord = void 0;
exports.writeString = writeString;
exports.writeWord = void 0;
var _assert = _interopRequireDefault(require("assert"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const ALLOWED_READ_METHODS = ['readBigInt64BE', 'readBigInt64LE', 'readBigUInt64BE', 'readBigUInt64LE', 'readDoubleBE', 'readDoubleLE', 'readFloatBE', 'readFloatLE', 'readInt16BE', 'readInt16LE', 'readInt32BE', 'readInt32LE', 'readInt8', 'readUInt16BE', 'readUInt16LE', 'readUInt32BE', 'readUInt32LE', 'readUInt8'];
const ALLOWED_WRITE_METHODS = ['writeBigInt64BE', 'writeBigInt64LE', 'writeBigUInt64BE', 'writeBigUInt64LE', 'writeDoubleBE', 'writeDoubleLE', 'writeFloatBE', 'writeFloatLE', 'writeInt16BE', 'writeInt16LE', 'writeInt32BE', 'writeInt32LE', 'writeInt8', 'writeUInt16BE', 'writeUInt16LE', 'writeUInt32BE', 'writeUInt32LE', 'writeUInt8'];
function readFn(size, method) {
  (0, _assert.default)(ALLOWED_READ_METHODS.includes(method), 'readFn invalid method');
  return function read(stream) {
    const buffer = stream.read(size);
    (0, _assert.default)(buffer, `read(${size}): empty value from stream`);
    return buffer[method]();
  };
}
function writeFn(size, method) {
  (0, _assert.default)(ALLOWED_WRITE_METHODS.includes(method), 'writeFn invalid method');
  return function write(stream, value) {
    const buffer = Buffer.alloc(size);
    buffer[method](value);
    stream.write(buffer);
  };
}
const readByte = readFn(1, 'readUInt8');
exports.readByte = readByte;
const readShort = readFn(2, 'readUInt16LE');
exports.readShort = readShort;
const readWord = readFn(4, 'readUInt32LE');
exports.readWord = readWord;
const readFloat = readFn(4, 'readFloatLE');
exports.readFloat = readFloat;
const readLong = readFn(8, 'readBigUInt64LE');
exports.readLong = readLong;
const writeByte = writeFn(1, 'writeUInt8');
exports.writeByte = writeByte;
const writeShort = writeFn(2, 'writeUInt16LE');
exports.writeShort = writeShort;
const writeWord = writeFn(4, 'writeUInt32LE');
exports.writeWord = writeWord;
const writeFloat = writeFn(4, 'writeFloatLE');
exports.writeFloat = writeFloat;
const writeLong = writeFn(8, 'writeBigUInt64LE');
exports.writeLong = writeLong;
function readString(stream) {
  const length = readByte(stream);
  if (length) {
    const str = stream.read(length);
    (0, _assert.default)(str, `read(${length}): empty value from stream`);
    return str.toString('utf8');
  }
  return '';
}
function writeString(stream, value) {
  writeByte(stream, value.length);
  const buffer = Buffer.from(value, 'utf8');
  stream.write(buffer);
}
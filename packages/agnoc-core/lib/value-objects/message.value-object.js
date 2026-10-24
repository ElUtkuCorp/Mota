"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Message = void 0;
var _valueObject = require("../base-classes/value-object.base");
var _connection = require("../emitters/connection.emitter");
var _argumentInvalid = require("../exceptions/argument-invalid.exception");
var _argumentNotProvided = require("../exceptions/argument-not-provided.exception");
var _isPresent = require("../utils/is-present.util");
var _packet = require("./packet.value-object");
/* eslint-disable @typescript-eslint/unbound-method */

class Message extends _valueObject.ValueObject {
  constructor(props) {
    super(props);
  }
  get connection() {
    return this.props.connection;
  }
  get packet() {
    return this.props.packet;
  }
  get opname() {
    return this.packet.payload.opcode.name;
  }
  respond(opname, object) {
    return this.connection.respond({
      packet: this.packet,
      opname,
      object
    });
  }
  toString() {
    return '[Message]';
  }
  validate(props) {
    if (![props.connection, props.packet].every(_isPresent.isPresent)) {
      throw new _argumentNotProvided.ArgumentNotProvidedException('Missing property in message constructor');
    }
    if (!(props.connection instanceof _connection.Connection)) {
      throw new _argumentInvalid.ArgumentInvalidException('Invalid connection in message constructor');
    }
    if (!(props.packet instanceof _packet.Packet)) {
      throw new _argumentInvalid.ArgumentInvalidException('Invalid packet in message constructor');
    }
    if (!(0, _isPresent.isPresent)(props.packet.payload.opcode.name)) {
      throw new _argumentInvalid.ArgumentInvalidException('Unknown packet in message constructor');
    }
  }
}
exports.Message = Message;
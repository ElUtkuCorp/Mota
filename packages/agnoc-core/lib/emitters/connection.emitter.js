"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Connection = void 0;
var _tinyTypedEmitter = require("tiny-typed-emitter");
var _bind = require("../decorators/bind.decorator");
var _argumentInvalid = require("../exceptions/argument-invalid.exception");
var _argumentNotProvided = require("../exceptions/argument-not-provided.exception");
var _domain = require("../exceptions/domain.exception");
var _packet = require("../sockets/packet.socket");
var _debug = require("../utils/debug.util");
var _isPresent = require("../utils/is-present.util");
var _bigNumber = require("../value-objects/big-number.value-object");
var _opcode = require("../value-objects/opcode.value-object");
var _packet2 = require("../value-objects/packet.value-object");
var _payload = require("../value-objects/payload.value-object");
var _class;
function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }
let Connection = (_class = class Connection extends _tinyTypedEmitter.TypedEmitter {
  constructor(socket) {
    super();
    this.socket = void 0;
    this.debug = void 0;
    this.validate(socket);
    this.socket = socket;
    this.addListeners();
    this.debug = (0, _debug.debug)(__filename).extend(this.toString());
    this.debug(`new connection`);
  }
  addListeners() {
    this.socket.on('data', this.handlePacket);
    this.socket.on('error', this.handleError);
    this.socket.on('close', this.handleClose);
  }
  send({
    opname,
    userId,
    deviceId,
    object
  }) {
    const packet = new _packet2.Packet({
      ctype: 2,
      flow: 0,
      // This swap is intended.
      userId: deviceId,
      deviceId: userId,
      sequence: _bigNumber.BigNumber.generate(),
      payload: _payload.Payload.fromObject(_opcode.OPCode.fromName(opname), object)
    });
    this.debug(`sending packet ${packet.toString()}`);
    return this.write(packet);
  }
  respond({
    packet,
    opname,
    object
  }) {
    const response = new _packet2.Packet({
      ctype: packet.ctype,
      flow: packet.flow + 1,
      // This swap is intended.
      userId: packet.deviceId,
      deviceId: packet.userId,
      sequence: packet.sequence,
      payload: _payload.Payload.fromObject(_opcode.OPCode.fromName(opname), object)
    });
    this.debug(`responding to packet with ${response.toString()}`);
    return this.write(response);
  }
  write(packet) {
    if (!this.socket.destroyed && !this.socket.connecting) {
      return this.socket.write(packet);
    }
    return false;
  }
  close() {
    this.debug('closing socket...');
    this.socket.end();
  }
  handlePacket(packet) {
    this.validatePacket(packet);
    const opname = packet.payload.opcode.name;
    if (!opname) {
      throw new _domain.DomainException(`Unable to handle unknown packet ${packet.payload.opcode.toString()}`);
    }
    this.debug(`received packet ${packet.toString()}`);
    this.emit(opname, packet);
    this.emit('data', packet);
  }
  handleError(err) {
    this.emit('error', err);
  }
  handleClose() {
    this.emit('close');
  }
  toString() {
    return `${this.socket.remoteAddress || 'unknown'}:${this.socket.remotePort || 0}::${this.socket.localAddress || 'unknown'}:${this.socket.localPort || 0}`;
  }
  validatePacket(packet) {
    if (!(packet instanceof _packet2.Packet)) {
      throw new _domain.DomainException('Connection socket emitted non-packet data');
    }
  }
  validate(socket) {
    if (!(0, _isPresent.isPresent)(socket)) {
      throw new _argumentNotProvided.ArgumentNotProvidedException('Missing property in connection constructor');
    }
    if (!(socket instanceof _packet.PacketSocket)) {
      throw new _argumentInvalid.ArgumentInvalidException('Invalid socket in connection constructor');
    }
  }
}, (_applyDecoratedDescriptor(_class.prototype, "handlePacket", [_bind.bind], Object.getOwnPropertyDescriptor(_class.prototype, "handlePacket"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "handleError", [_bind.bind], Object.getOwnPropertyDescriptor(_class.prototype, "handleError"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "handleClose", [_bind.bind], Object.getOwnPropertyDescriptor(_class.prototype, "handleClose"), _class.prototype)), _class);
exports.Connection = Connection;
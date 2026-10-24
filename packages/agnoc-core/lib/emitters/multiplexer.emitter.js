"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Multiplexer = void 0;
var _tinyTypedEmitter = require("tiny-typed-emitter");
var _bind = require("../decorators/bind.decorator");
var _domain = require("../exceptions/domain.exception");
var _debug = require("../utils/debug.util");
var _class;
function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }
let Multiplexer = (_class = class Multiplexer extends _tinyTypedEmitter.TypedEmitter {
  constructor(...args) {
    super(...args);
    this.connections = [];
    this.debug = (0, _debug.debug)(__filename);
  }
  get hasConnections() {
    return this.connections.length > 0;
  }
  get connectionCount() {
    return this.connections.length;
  }
  addConnection(connection) {
    if (!this.connections.includes(connection)) {
      connection.on('data', this.handlePacket);
      connection.on('error', err => this.handleError(connection, err));
      connection.on('close', () => this.handleClose(connection));
      this.connections = [...this.connections, connection];
      this.debug('added connection');
      return true;
    }
    return false;
  }
  send(props) {
    const connection = this.connections[0];
    if (!connection) {
      this.emit('error', new _domain.DomainException(`No valid connection found to send packet ${props.opname}`));
      return false;
    }
    return connection.send(props);
  }
  close() {
    this.debug('closing connections...');
    this.connections.forEach(connection => {
      connection.close();
    });
  }
  handlePacket(packet) {
    const opname = packet.payload.opcode.name;
    if (!opname) {
      throw new _domain.DomainException(`Unable to handle unknown packet ${packet.payload.opcode.toString()}`);
    }
    this.emit(opname, packet);
    this.emit('data', packet);
  }
  handleError(connection, err) {
    this.emit('error', err);
    this.handleClose(connection);
  }
  handleClose(connection) {
    // TODO: fix this.
    // Remove all listeners to prevent mem leaks.
    // But ensure error handling works...
    // connection.removeAllListeners();

    this.connections = this.connections.filter(conn => conn !== connection);
    this.debug('removed connection');
  }
}, (_applyDecoratedDescriptor(_class.prototype, "handlePacket", [_bind.bind], Object.getOwnPropertyDescriptor(_class.prototype, "handlePacket"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "handleError", [_bind.bind], Object.getOwnPropertyDescriptor(_class.prototype, "handleError"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "handleClose", [_bind.bind], Object.getOwnPropertyDescriptor(_class.prototype, "handleClose"), _class.prototype)), _class);
exports.Multiplexer = Multiplexer;
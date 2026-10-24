"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PacketServer = void 0;
var _net = require("net");
var _tinyTypedEmitter = require("tiny-typed-emitter");
var _packet = require("../sockets/packet.socket");
class PacketServer extends _tinyTypedEmitter.TypedEmitter {
  constructor() {
    super();
    this.server = void 0;
    this.server = new _net.Server();
    this.addListeners();
  }
  get isListening() {
    return this.server.listening;
  }
  get address() {
    return this.server.address();
  }
  async listen(portOrOptions, hostname) {
    return await new Promise(resolve => {
      if (typeof portOrOptions === 'number' && hostname) {
        this.server.listen(portOrOptions, hostname, resolve);
      } else {
        this.server.listen(portOrOptions, resolve);
      }
    });
  }
  async close() {
    return await new Promise((resolve, reject) => {
      this.server.close(e => {
        if (e) {
          reject(e);
          return;
        }
        resolve();
      });
    });
  }
  onConnection(socket) {
    const client = new _packet.PacketSocket({
      socket
    });
    this.emit('connection', client);
  }
  addListeners() {
    this.server.on('connection', this.onConnection.bind(this));
    this.server.on('error', e => this.emit('error', e));
    this.server.on('listening', () => this.emit('listening'));
    this.server.on('close', () => this.emit('close'));
  }
}
exports.PacketServer = PacketServer;
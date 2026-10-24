"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PacketSocket = void 0;
var _net = require("net");
var _stream = require("stream");
var _domain = require("../exceptions/domain.exception");
var _packet = require("../value-objects/packet.value-object");
class PacketSocket extends _stream.Duplex {
  constructor(props) {
    super({
      objectMode: true
    });
    this.socket = void 0;
    this.readingPaused = false;
    if (props !== null && props !== void 0 && props.socket) {
      this.wrapSocket(props.socket);
    }
  }
  connect(portOrPathOrOptions, host) {
    const socket = new _net.Socket();
    this.wrapSocket(socket);
    return new Promise(resolve => {
      if (typeof portOrPathOrOptions === 'number' && host) {
        socket.connect(portOrPathOrOptions, host, resolve);
      } else if (typeof portOrPathOrOptions === 'number') {
        socket.connect(portOrPathOrOptions, resolve);
      } else if (typeof portOrPathOrOptions === 'string') {
        socket.connect(portOrPathOrOptions, resolve);
      } else {
        socket.connect(portOrPathOrOptions, resolve);
      }
    });
  }
  get localAddress() {
    var _this$socket;
    return (_this$socket = this.socket) === null || _this$socket === void 0 ? void 0 : _this$socket.localAddress;
  }
  get localPort() {
    var _this$socket2;
    return (_this$socket2 = this.socket) === null || _this$socket2 === void 0 ? void 0 : _this$socket2.localPort;
  }
  get remoteAddress() {
    var _this$socket3;
    return (_this$socket3 = this.socket) === null || _this$socket3 === void 0 ? void 0 : _this$socket3.remoteAddress;
  }
  get remotePort() {
    var _this$socket4;
    return (_this$socket4 = this.socket) === null || _this$socket4 === void 0 ? void 0 : _this$socket4.remotePort;
  }
  address() {
    var _this$socket5;
    return ((_this$socket5 = this.socket) === null || _this$socket5 === void 0 ? void 0 : _this$socket5.address()) || {};
  }
  get connecting() {
    var _this$socket6;
    return Boolean((_this$socket6 = this.socket) === null || _this$socket6 === void 0 ? void 0 : _this$socket6.connecting);
  }
  wrapSocket(socket) {
    this.socket = socket;
    this.socket.on('close', hadError => this.emit('close', hadError));
    this.socket.on('connect', () => this.emit('connect'));
    this.socket.on('drain', () => this.emit('drain'));
    this.socket.on('end', () => this.emit('end'));
    this.socket.on('error', err => this.emit('error', err));
    this.socket.on('lookup', (err, address, family, host) => this.emit('lookup', err, address, family, host)); // prettier-ignore
    this.socket.on('ready', () => this.emit('ready'));
    this.socket.on('timeout', () => this.emit('timeout'));
    this.socket.on('readable', () => setImmediate(this.onReadable.bind(this)));
  }
  onReadable() {
    if (!this.socket) {
      return;
    }
    while (!this.readingPaused) {
      const lenBuf = this.socket.read(4);
      if (!lenBuf) {
        return;
      }
      const len = lenBuf.readUInt32LE();
      if (len > 2 ** 20) {
        this.socket.destroy(new _domain.DomainException('Max length exceeded'));
        return;
      }
      this.socket.unshift(lenBuf);
      const body = this.socket.read(len);
      if (!body) {
        return;
      }
      let packet;
      try {
        packet = _packet.Packet.fromBuffer(body);
      } catch (e) {
        this.socket.destroy(e);
        return;
      }
      const pushOk = this.push(packet);
      if (!pushOk) {
        this.readingPaused = true;
      }
    }
  }
  _read() {
    this.readingPaused = false;
    setImmediate(this.onReadable.bind(this));
  }
  _write(packet, _, done) {
    if (!this.socket) {
      done(new _domain.DomainException('Called _write without connection'));
      return;
    }
    const buffer = packet.toBuffer();
    try {
      this.socket.write(buffer, done);
    } catch (e) {
      done(e);
    }
  }
  _final(done) {
    if (!this.socket) {
      done(new _domain.DomainException('Called _final without connection'));
      return;
    }
    try {
      this.socket.end(done);
    } catch (e) {
      done(e);
    }
  }
}
exports.PacketSocket = PacketSocket;
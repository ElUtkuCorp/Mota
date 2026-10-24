"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CloudServer = void 0;
var _tinyTypedEmitter = require("tiny-typed-emitter");
var _bind = require("../decorators/bind.decorator");
var _device = require("../entities/device.entity");
var _user = require("../entities/user.entity");
var _deviceSystem = require("../value-objects/device-system.value-object");
var _deviceVersion = require("../value-objects/device-version.value-object");
var _id = require("../value-objects/id.value-object");
var _message = require("../value-objects/message.value-object");
var _connection = require("./connection.emitter");
var _multiplexer = require("./multiplexer.emitter");
var _packetServer = require("./packet-server.emitter");
var _robot = require("./robot.emitter");
var _class;
function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }
let CloudServer = (_class = class CloudServer extends _tinyTypedEmitter.TypedEmitter {
  constructor() {
    super();
    this.robots = new Map();
    this.servers = void 0;
    this.handlers = {
      CLIENT_ONLINE_REQ: this.handleClientLogin,
      DEVICE_REGISTER_REQ: this.handleClientRegister
    };
    this.servers = {
      cmd: new _packetServer.PacketServer(),
      map: new _packetServer.PacketServer(),
      rtc: new _packetServer.PacketServer()
    };
    this.addListeners();
  }
  getRobots() {
    return [...this.robots.values()];
  }
  async listen(host) {
    await Promise.all([this.servers.cmd.listen({
      host,
      port: 4010
    }), this.servers.map.listen({
      host,
      port: 4030
    }), this.servers.rtc.listen({
      host,
      port: 4050
    })]);
  }
  async close() {
    this.getRobots().map(robot => {
      robot.disconnect();
    });
    await Promise.all([this.servers.cmd.close(), this.servers.map.close(), this.servers.rtc.close()]);
  }
  handleClientLogin(message) {
    const robot = this.robots.get(message.packet.deviceId.value);
    if (!robot) {
      const object = message.packet.payload.object;
      message.respond('CLIENT_ONLINE_RSP', {
        result: 12002,
        reason: `Device not registered(devsn: ${object.deviceSerialNumber})`
      });
    } else {
      message.respond('CLIENT_ONLINE_RSP', {
        result: 0
      });
    }
  }
  handleClientRegister(message) {
    const props = message.packet.payload.object;
    const multiplexer = new _multiplexer.Multiplexer();
    const device = new _device.Device({
      id: _id.ID.generate(),
      system: new _deviceSystem.DeviceSystem(props),
      version: new _deviceVersion.DeviceVersion({
        software: props.softwareVersion,
        hardware: props.hardwareVersion
      })
    });
    const user = new _user.User({
      id: _id.ID.generate()
    });
    const robot = new _robot.Robot({
      device,
      user,
      multiplexer
    });
    multiplexer.on('error', err => this.emit('error', err));
    robot.addConnection(message.connection);
    this.robots.set(device.id.value, robot);
    this.emit('addRobot', robot);
    message.respond('DEVICE_REGISTER_RSP', {
      result: 0,
      device: {
        id: device.id.value
      }
    });
  }
  handleMessage(message) {
    const handler = this.handlers[message.opname];
    if (handler) {
      return handler(message);
    }
    const robot = this.robots.get(message.packet.deviceId.value);
    if (robot) {
      robot.addConnection(message.connection);
      robot.handleMessage(message);
      return;
    }
    message.respond('COMMON_ERROR_REPLY', {
      // TODO: type this.
      result: 1,
      opcode: message.packet.payload.opcode.value,
      error: 'Device not registered'
    });
  }
  handleConnection(socket) {
    const connection = new _connection.Connection(socket);
    connection.on('data', packet => {
      const message = new _message.Message({
        connection,
        packet
      });
      this.handleMessage(message);
    });
  }
  handleRTPConnection(socket) {
    const connection = new _connection.Connection(socket);
    connection.send({
      opname: 'DEVICE_TIME_SYNC_RSP',
      userId: new _id.ID(0),
      deviceId: new _id.ID(0),
      object: {
        result: 0,
        body: {
          time: Math.floor(Date.now() / 1000)
        }
      }
    });
    connection.close();
  }
  addListeners() {
    this.servers.cmd.on('connection', this.handleConnection);
    this.servers.map.on('connection', this.handleConnection);
    this.servers.rtc.on('connection', this.handleRTPConnection);
  }
}, (_applyDecoratedDescriptor(_class.prototype, "handleClientLogin", [_bind.bind], Object.getOwnPropertyDescriptor(_class.prototype, "handleClientLogin"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "handleClientRegister", [_bind.bind], Object.getOwnPropertyDescriptor(_class.prototype, "handleClientRegister"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "handleMessage", [_bind.bind], Object.getOwnPropertyDescriptor(_class.prototype, "handleMessage"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "handleConnection", [_bind.bind], Object.getOwnPropertyDescriptor(_class.prototype, "handleConnection"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "handleRTPConnection", [_bind.bind], Object.getOwnPropertyDescriptor(_class.prototype, "handleRTPConnection"), _class.prototype)), _class);
exports.CloudServer = CloudServer;
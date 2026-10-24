"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AggregateRoot = void 0;
var _tinyTypedEmitter = require("tiny-typed-emitter");
var _entity = require("./entity.base");
class AggregateRoot extends _entity.Entity {
  constructor(...args) {
    super(...args);
    this.eventEmitter = new _tinyTypedEmitter.TypedEmitter();
  }
  addListener(event, listener) {
    this.eventEmitter.addListener(event, listener);
    return this;
  }
  prependListener(event, listener) {
    this.eventEmitter.prependListener(event, listener);
    return this;
  }
  prependOnceListener(event, listener) {
    this.eventEmitter.prependOnceListener(event, listener);
    return this;
  }
  removeListener(event, listener) {
    this.eventEmitter.removeListener(event, listener);
    return this;
  }
  removeAllListeners(event) {
    this.eventEmitter.removeAllListeners(event);
    return this;
  }
  once(event, listener) {
    this.eventEmitter.once(event, listener);
    return this;
  }
  on(event, listener) {
    this.eventEmitter.on(event, listener);
    return this;
  }
  off(event, listener) {
    this.eventEmitter.off(event, listener);
    return this;
  }
  emit(event, ...args) {
    return this.eventEmitter.emit(event, ...args);
  }
  eventNames() {
    return this.eventEmitter.eventNames();
  }
  listenerCount(type) {
    return this.eventEmitter.listenerCount(type);
  }
  listeners(type) {
    return this.eventEmitter.listeners(type);
  }
  rawListeners(type) {
    return this.eventEmitter.rawListeners(type);
  }
  getMaxListeners() {
    return this.eventEmitter.getMaxListeners();
  }
  setMaxListeners(n) {
    this.eventEmitter.setMaxListeners(n);
    return this;
  }
}
exports.AggregateRoot = AggregateRoot;
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NotImplementedException = void 0;
var _exception = require("../base-classes/exception.base");
var _exception2 = require("../constants/exception.constant");
class NotImplementedException extends _exception.Exception {
  constructor(...args) {
    super(...args);
    this.name = _exception2.Exceptions.notImplemented;
  }
}
exports.NotImplementedException = NotImplementedException;
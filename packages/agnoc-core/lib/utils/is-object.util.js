"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isObject = isObject;
var _isPresent = require("./is-present.util");
function isObject(obj) {
  return (0, _isPresent.isPresent)(obj) && !Array.isArray(obj) && typeof obj === 'object';
}
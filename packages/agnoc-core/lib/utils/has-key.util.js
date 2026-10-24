"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.hasKey = hasKey;
function hasKey(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}
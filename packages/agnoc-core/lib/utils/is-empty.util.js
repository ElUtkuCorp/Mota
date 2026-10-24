"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isEmpty = isEmpty;
function isEmpty(value) {
  if (typeof value === 'number' || typeof value === 'boolean') {
    return false;
  }
  if (typeof value === 'undefined' || value === null) {
    return true;
  }
  if (value instanceof Date) {
    return false;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return true;
    }
    if (value.every(item => isEmpty(item))) {
      return true;
    }
  }
  if (value instanceof Object && !Object.keys(value).length) {
    return true;
  }
  if (value === '') {
    return true;
  }
  return false;
}
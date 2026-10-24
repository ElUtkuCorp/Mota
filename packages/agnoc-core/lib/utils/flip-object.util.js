"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.flipObject = flipObject;
function flipObject(obj) {
  const entries = Object.entries(obj);
  return entries.reduce((acc, [key, value]) => {
    acc[value] = key;
    return acc;
  }, {});
}
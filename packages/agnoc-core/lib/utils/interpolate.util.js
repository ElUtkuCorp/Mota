"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.interpolate = interpolate;
var _argumentOutOfRange = require("../exceptions/argument-out-of-range.exception");
function interpolate(value, from, to) {
  if (value < from.min || value > from.max) {
    throw new _argumentOutOfRange.ArgumentOutOfRangeException(`Value '${value}' is out of range of min '${from.min}' and max '${from.max}'`);
  }
  return (value - from.min) * (to.max - to.min) / (from.max - from.min) + to.min;
}
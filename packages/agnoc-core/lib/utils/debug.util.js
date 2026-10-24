"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.debug = debug;
var _path = _interopRequireDefault(require("path"));
var _debug = _interopRequireDefault(require("debug"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function debug(filename) {
  const extname = _path.default.extname(filename);
  const basename = _path.default.basename(filename, extname);
  return (0, _debug.default)('agnoc').extend('core').extend(basename);
}
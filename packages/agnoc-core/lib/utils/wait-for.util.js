"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.waitFor = waitFor;
var _domain = require("../exceptions/domain.exception");
const DEFAULT_OPTIONS = {
  timeout: 2 ** 31 - 1,
  interval: 50
};
function waitFor(callback, options) {
  return new Promise((resolve, reject) => {
    const opts = Object.assign({}, DEFAULT_OPTIONS, options);
    function check() {
      const ret = callback();
      if (ret) {
        clearTimeout(abortTimer);
        resolve();
      } else {
        checkTimer = setTimeout(check, opts.interval);
      }
    }
    function abort() {
      clearTimeout(checkTimer);
      reject(new _domain.DomainException('Timeout on wait for function'));
    }
    const abortTimer = setTimeout(abort, opts.timeout);
    let checkTimer;
    process.nextTick(check);
  });
}
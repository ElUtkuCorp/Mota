"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.bind = bind;
/* eslint-disable @typescript-eslint/ban-types */
function bind(_, propertyKey, descriptor) {
  if (!descriptor || typeof descriptor.value !== 'function') {
    throw new TypeError(`Only methods can be decorated with @bind. <${propertyKey}> is not a method!`);
  }
  return {
    configurable: true,
    get() {
      const bound = descriptor.value.bind(this);
      Object.defineProperty(this, propertyKey, {
        value: bound,
        configurable: true,
        writable: true
      });
      return bound;
    }
  };
}
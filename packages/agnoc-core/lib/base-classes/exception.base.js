"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Exception = void 0;
class Exception extends Error {
  constructor(message, metadata) {
    super(message);
    this.message = void 0;
    this.metadata = void 0;
    this.name = void 0;
    this.message = message;
    this.metadata = metadata;
    Error.captureStackTrace(this, this.constructor);
  }
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      stack: this.stack,
      metadata: this.metadata
    };
  }
}
exports.Exception = Exception;
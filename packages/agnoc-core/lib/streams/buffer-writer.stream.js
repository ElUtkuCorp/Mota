"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BufferWriter = void 0;
var _stream = require("stream");
class BufferWriter extends _stream.Writable {
  constructor(buffer) {
    super({
      objectMode: true
    });
    this.buffer = void 0;
    this.buffer = buffer || Buffer.alloc(0);
  }
  _write(chunk, _, done) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    done();
  }
}
exports.BufferWriter = BufferWriter;
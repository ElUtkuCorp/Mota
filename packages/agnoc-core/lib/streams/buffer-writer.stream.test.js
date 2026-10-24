"use strict";

var _chai = require("chai");
var _mocha = require("mocha");
var _bufferWriter = require("./buffer-writer.stream");
(0, _mocha.describe)('buffer-writer.stream', () => {
  (0, _mocha.it)('creates an empty writable stream', () => {
    const stream = new _bufferWriter.BufferWriter();
    (0, _chai.expect)(stream.buffer).to.be.empty;
    stream.write(Buffer.from('hello', 'utf8'));
    (0, _chai.expect)(stream.buffer.toString('utf8')).to.be.equal('hello');
  });
  (0, _mocha.it)('creates a writable stream from a buffer', () => {
    const stream = new _bufferWriter.BufferWriter(Buffer.from('hello', 'utf8'));
    (0, _chai.expect)(stream.buffer.toString('utf8')).to.be.equal('hello');
    stream.write(Buffer.from('world', 'utf8'));
    (0, _chai.expect)(stream.buffer.toString('utf8')).to.be.equal('helloworld');
  });
});
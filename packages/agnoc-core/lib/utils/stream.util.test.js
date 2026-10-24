"use strict";

var _assert = require("assert");
var _stream = require("stream");
var _chai = require("chai");
var _mocha = require("mocha");
var _bufferWriter = require("../streams/buffer-writer.stream");
var _stream2 = require("./stream.util");
(0, _mocha.describe)('stream.util', () => {
  (0, _mocha.describe)('read', () => {
    (0, _mocha.describe)('readWord', () => {
      (0, _mocha.it)('reads a word from a stream', () => {
        const stream = _stream.Readable.from(Buffer.from('0102030405060708', 'hex'), {
          objectMode: false
        });
        const ret = (0, _stream2.readWord)(stream);
        (0, _chai.expect)(ret.toString(16)).to.be.equal('4030201');
      });
      (0, _mocha.it)('throws an error when stream has not enough data', () => {
        const stream = _stream.Readable.from(Buffer.alloc(0), {
          objectMode: false
        });
        (0, _chai.expect)(() => {
          (0, _stream2.readWord)(stream);
        }).to.throw(_assert.AssertionError);
      });
    });
    (0, _mocha.describe)('readShort', () => {
      (0, _mocha.it)('reads a word from a stream', () => {
        const stream = _stream.Readable.from(Buffer.from('0102030405060708', 'hex'), {
          objectMode: false
        });
        const ret = (0, _stream2.readShort)(stream);
        (0, _chai.expect)(ret.toString(16)).to.be.equal('201');
      });
      (0, _mocha.it)('throws an error when stream has not enough data', () => {
        const stream = _stream.Readable.from(Buffer.alloc(0), {
          objectMode: false
        });
        (0, _chai.expect)(() => {
          (0, _stream2.readShort)(stream);
        }).to.throw(_assert.AssertionError);
      });
    });
    (0, _mocha.describe)('readByte', () => {
      (0, _mocha.it)('reads a word from a stream', () => {
        const stream = _stream.Readable.from(Buffer.from('0102030405060708', 'hex'), {
          objectMode: false
        });
        const ret = (0, _stream2.readByte)(stream);
        (0, _chai.expect)(ret.toString(16)).to.be.equal('1');
      });
      (0, _mocha.it)('throws an error when stream has not enough data', () => {
        const stream = _stream.Readable.from(Buffer.alloc(0), {
          objectMode: false
        });
        (0, _chai.expect)(() => {
          (0, _stream2.readByte)(stream);
        }).to.throw(_assert.AssertionError);
      });
    });
    (0, _mocha.describe)('readLong', () => {
      (0, _mocha.it)('reads a word from a stream', () => {
        const stream = _stream.Readable.from(Buffer.from('01020304050607080910', 'hex'), {
          objectMode: false
        });
        const ret = (0, _stream2.readLong)(stream);
        (0, _chai.expect)(ret.toString(16)).to.be.equal('807060504030201');
      });
      (0, _mocha.it)('throws an error when stream has not enough data', () => {
        const stream = _stream.Readable.from(Buffer.alloc(0), {
          objectMode: false
        });
        (0, _chai.expect)(() => {
          (0, _stream2.readLong)(stream);
        }).to.throw(_assert.AssertionError);
      });
    });
    (0, _mocha.describe)('readFloat', () => {
      (0, _mocha.it)('reads a word from a stream', () => {
        const stream = _stream.Readable.from(Buffer.from('0000c03f0000c03f', 'hex'), {
          objectMode: false
        });
        const ret = (0, _stream2.readFloat)(stream);
        (0, _chai.expect)(ret).to.be.equal(1.5);
      });
      (0, _mocha.it)('throws an error when stream has not enough data', () => {
        const stream = _stream.Readable.from(Buffer.alloc(0), {
          objectMode: false
        });
        (0, _chai.expect)(() => {
          (0, _stream2.readFloat)(stream);
        }).to.throw(_assert.AssertionError);
      });
    });
    (0, _mocha.describe)('readString', () => {
      (0, _mocha.it)('reads a word from a stream', () => {
        const stream = _stream.Readable.from(Buffer.from('046162636465666768', 'hex'), {
          objectMode: false
        });
        const ret = (0, _stream2.readString)(stream);
        (0, _chai.expect)(ret).to.be.equal('abcd');
      });
      (0, _mocha.it)('reads an empty word', () => {
        const stream = _stream.Readable.from(Buffer.from('00000000', 'hex'), {
          objectMode: false
        });
        const ret = (0, _stream2.readString)(stream);
        (0, _chai.expect)(ret).to.be.equal('');
      });
      (0, _mocha.it)('throws an error when stream has not enough data', () => {
        const stream = _stream.Readable.from(Buffer.alloc(0), {
          objectMode: false
        });
        (0, _chai.expect)(() => {
          (0, _stream2.readString)(stream);
        }).to.throw(_assert.AssertionError);
      });
    });
  });
  (0, _mocha.describe)('write', () => {
    beforeEach(function () {
      this.writer = new _bufferWriter.BufferWriter();
    });
    (0, _mocha.it)('writes a word to a stream', function () {
      (0, _stream2.writeWord)(this.writer, 0x01020304);
      (0, _chai.expect)(this.writer.buffer.toString('hex')).to.be.equal('04030201');
    });
    (0, _mocha.it)('writes a short to a stream', function () {
      (0, _stream2.writeShort)(this.writer, 0x0102);
      (0, _chai.expect)(this.writer.buffer.toString('hex')).to.be.equal('0201');
    });
    (0, _mocha.it)('writes a byte to a stream', function () {
      (0, _stream2.writeByte)(this.writer, 0x01);
      (0, _chai.expect)(this.writer.buffer.toString('hex')).to.be.equal('01');
    });
    (0, _mocha.it)('writes a long to a stream', function () {
      (0, _stream2.writeLong)(this.writer, BigInt('0x0807060504030201'));
      (0, _chai.expect)(this.writer.buffer.toString('hex')).to.be.equal('0102030405060708');
    });
    (0, _mocha.it)('writes a float to a stream', function () {
      (0, _stream2.writeFloat)(this.writer, 1.5);
      (0, _chai.expect)(this.writer.buffer.toString('hex')).to.be.equal('0000c03f');
    });
    (0, _mocha.it)('writes a string to a stream', function () {
      (0, _stream2.writeString)(this.writer, 'abcd');
      (0, _chai.expect)(this.writer.buffer.toString('hex')).to.be.equal('0461626364');
    });
  });
});
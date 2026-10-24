"use strict";

var _chai = require("chai");
var _mocha = require("mocha");
var _exception = require("../constants/exception.constant");
var _exception2 = require("./exception.base");
(0, _mocha.describe)('exception.base', () => {
  (0, _mocha.it)('extends from error', () => {
    class E extends _exception2.Exception {
      constructor(...args) {
        super(...args);
        this.name = _exception.Exceptions.domain;
      }
    }
    const e = new E('foo');
    (0, _chai.expect)(e).to.be.instanceof(Error);
  });
  (0, _mocha.it)('has metadata', () => {
    class E extends _exception2.Exception {
      constructor(...args) {
        super(...args);
        this.name = _exception.Exceptions.domain;
      }
    }
    const e = new E('foo', {
      foo: 'bar'
    });
    (0, _chai.expect)(e.metadata).to.be.deep.equal({
      foo: 'bar'
    });
  });
  (0, _mocha.it)('can be converted to object', () => {
    class E extends _exception2.Exception {
      constructor(...args) {
        super(...args);
        this.name = _exception.Exceptions.domain;
      }
    }
    const e = new E('foo', {
      foo: 'bar'
    });
    (0, _chai.expect)(e.toJSON()).to.be.deep.equal({
      name: _exception.Exceptions.domain,
      message: 'foo',
      stack: e.stack,
      metadata: {
        foo: 'bar'
      }
    });
  });
});
"use strict";

var _chai = require("chai");
var _mocha = require("mocha");
var _valueObject = require("../base-classes/value-object.base");
var _argumentInvalid = require("../exceptions/argument-invalid.exception");
var _id = require("./id.value-object");
(0, _mocha.describe)('id.value-object', () => {
  (0, _mocha.it)('inherits value object', () => {
    const id = new _id.ID(1);
    (0, _chai.expect)(id).to.be.instanceof(_valueObject.ValueObject);
  });
  (0, _mocha.it)('returns its value', () => {
    const id = new _id.ID(1);
    (0, _chai.expect)(id.value).to.be.equal(1);
  });
  (0, _mocha.it)('throws an error when it is not a number', () => {
    (0, _chai.expect)(() => {
      // @ts-expect-error invalid argument
      new _id.ID('foo');
    }).to.throw(_argumentInvalid.ArgumentInvalidException);
  });
  (0, _mocha.it)('generates random id', () => {
    const id = _id.ID.generate();
    (0, _chai.expect)(id).to.be.instanceof(_id.ID);
  });
});
"use strict";

var _chai = require("chai");
var _mocha = require("mocha");
var _flipObject = require("./flip-object.util");
(0, _mocha.describe)('flip-object.util', () => {
  (0, _mocha.it)('flips object keys', () => {
    const obj = {
      foo: 'bar',
      1: 2
    };
    const ret = (0, _flipObject.flipObject)(obj);
    (0, _chai.expect)(ret).to.have.property('bar', 'foo');
    (0, _chai.expect)(ret[2]).to.be.equal('1');
  });
});
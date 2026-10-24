"use strict";

var _chai = require("chai");
var _mocha = require("mocha");
var _isEmpty = require("./is-empty.util");
/* eslint-disable mocha/no-setup-in-describe, @typescript-eslint/restrict-template-expressions */

const emptyList = [null, undefined, [], '', new Object(null), {}];
const presentList = [true, 'foo', {
  foo: 'bar'
}, [1, 2, 3], new Date()];
(0, _mocha.describe)('is-empty.util', () => {
  [...emptyList, emptyList].forEach(item => {
    (0, _mocha.it)('returns true when it is empty', () => {
      (0, _chai.expect)((0, _isEmpty.isEmpty)(item), `${item} is empty`).to.be.true;
    });
  });
  presentList.forEach(item => {
    (0, _mocha.it)('returns false when it is not empty', () => {
      (0, _chai.expect)((0, _isEmpty.isEmpty)(item), `${item} is empty`).to.be.false;
    });
  });
});
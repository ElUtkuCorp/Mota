"use strict";

var _chai = require("chai");
var _mocha = require("mocha");
var _argumentOutOfRange = require("../exceptions/argument-out-of-range.exception");
var _interpolate = require("./interpolate.util");
(0, _mocha.describe)('interpolate.util', () => {
  (0, _mocha.it)('returns interpolated value from positive range', () => {
    const from = {
      min: 50,
      max: 100
    };
    const to = {
      min: 100,
      max: 150
    };
    const ret = (0, _interpolate.interpolate)(60, from, to);
    (0, _chai.expect)(ret).to.be.equal(110);
  });
  (0, _mocha.it)('returns interpolated value from negative range', () => {
    const from = {
      min: -100,
      max: -50
    };
    const to = {
      min: -150,
      max: -100
    };
    const ret = (0, _interpolate.interpolate)(-60, from, to);
    (0, _chai.expect)(ret).to.be.equal(-110);
  });
  (0, _mocha.it)('returns interpolated value from mixed range', () => {
    const from = {
      min: -1000,
      max: -500
    };
    const to = {
      min: 500,
      max: 1000
    };
    const ret = (0, _interpolate.interpolate)(-600, from, to);
    (0, _chai.expect)(ret).to.be.equal(900);
  });
  (0, _mocha.it)('throws an error when value is out of range', () => {
    const from = {
      min: 50,
      max: 100
    };
    const to = {
      min: 100,
      max: 150
    };
    (0, _chai.expect)(() => {
      (0, _interpolate.interpolate)(25, from, to);
    }).to.throw(_argumentOutOfRange.ArgumentOutOfRangeException);
  });
});
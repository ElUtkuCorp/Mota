"use strict";

var _chai = require("chai");
var _mocha = require("mocha");
var _sinon = _interopRequireDefault(require("sinon"));
var _domain = require("../exceptions/domain.exception");
var _waitFor = require("./wait-for.util");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
(0, _mocha.describe)('wait-for.util', () => {
  let timer;
  beforeEach(function () {
    timer = _sinon.default.useFakeTimers();
  });
  afterEach(function () {
    timer.restore();
  });
  (0, _mocha.it)('resolves when condition is met', async () => {
    let check = false,
      called = false;
    const promise = (0, _waitFor.waitFor)(() => check);
    void promise.then(() => {
      called = true;
    });
    (0, _chai.expect)(called).to.be.false;
    check = true;
    await timer.tickAsync(1);
    (0, _chai.expect)(called).to.be.true;
  });
  (0, _mocha.it)('rejects when condition is not met and timeout triggers', async () => {
    let called = false;
    const check = false;
    const promise = (0, _waitFor.waitFor)(() => check, {
      timeout: 100
    });
    void promise.catch(e => {
      (0, _chai.expect)(e).to.be.instanceof(_domain.DomainException);
      called = true;
    });
    await timer.tickAsync(50);
    (0, _chai.expect)(called).to.be.false;
    await timer.tickAsync(50);
    (0, _chai.expect)(called).to.be.true;
  });
});
"use strict";

var _chai = require("chai");
var _mocha = require("mocha");
var _argumentInvalid = require("../exceptions/argument-invalid.exception");
var _argumentNotProvided = require("../exceptions/argument-not-provided.exception");
var _id = require("../value-objects/id.value-object");
var _entity = require("./entity.base");
(0, _mocha.describe)('entity.base', () => {
  (0, _mocha.it)('throws an error when does not have props', () => {
    class A extends _entity.Entity {}
    (0, _chai.expect)(() => {
      // @ts-expect-error expected argument
      new A();
    }).to.throw(_argumentInvalid.ArgumentInvalidException);
  });
  (0, _mocha.it)('throws an error when does not have an id', () => {
    class A extends _entity.Entity {}
    (0, _chai.expect)(() => {
      // @ts-expect-error argument invalid
      new A({
        foo: 'bar'
      });
    }).to.throw(_argumentNotProvided.ArgumentNotProvidedException);
  });
  (0, _mocha.it)('throws an error when has an invalid id', () => {
    class A extends _entity.Entity {}
    (0, _chai.expect)(() => {
      // @ts-expect-error argument invalid
      new A({
        id: 123
      });
    }).to.throw(_argumentInvalid.ArgumentInvalidException);
  });
  (0, _mocha.it)('has id property', () => {
    class A extends _entity.Entity {}
    const id = _id.ID.generate();
    const a = new A({
      id
    });
    (0, _chai.expect)(a.id.equals(id)).to.be.true;
  });
  (0, _mocha.it)('has identity equality', () => {
    class A extends _entity.Entity {}
    const a = new A({
      id: new _id.ID(1)
    });
    const b = new A({
      id: new _id.ID(1)
    });
    const c = new A({
      id: new _id.ID(2)
    });
    (0, _chai.expect)(a.equals(a), 'a equals a').to.be.true;
    (0, _chai.expect)(a.equals(b), 'a equals b').to.be.true;
    (0, _chai.expect)(a.equals(c), 'a not equals c').to.be.false;
    (0, _chai.expect)(a.equals(), 'a not equals null').to.be.false;
    // @ts-expect-error argument not assignable
    (0, _chai.expect)(a.equals('foo'), 'a not equals a non-entity').to.be.false;
  });
  (0, _mocha.it)('is an entity', () => {
    class A extends _entity.Entity {}
    const a = new A({
      id: _id.ID.generate()
    });
    (0, _chai.expect)(_entity.Entity.isEntity(a)).to.be.true;
  });
  (0, _mocha.it)('returns a copy of itself', () => {
    class A extends _entity.Entity {}
    const a = new A({
      id: new _id.ID(1),
      foo: 'bar'
    });
    const b = a.clone({
      foo: 'foo'
    });
    (0, _chai.expect)(b).to.be.instanceof(A);
    (0, _chai.expect)(b.toJSON()).to.be.deep.equal({
      id: 1,
      foo: 'foo'
    });
  });
  (0, _mocha.it)('returns a copy of its props as a frozen object', () => {
    class A extends _entity.Entity {}
    const a = new A({
      id: new _id.ID(1),
      foo: 'bar'
    });
    (0, _chai.expect)(a.toJSON()).to.be.deep.equal({
      id: 1,
      foo: 'bar'
    });
  });
  (0, _mocha.it)('returns a copy of its props as a string', () => {
    class A extends _entity.Entity {}
    const a = new A({
      id: new _id.ID(1),
      foo: 'bar'
    });
    (0, _chai.expect)(a.toString()).to.be.deep.equal('{"id":1,"foo":"bar"}');
  });
});
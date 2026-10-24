"use strict";

var _chai = require("chai");
var _mocha = require("mocha");
var _sinon = _interopRequireDefault(require("sinon"));
var _argumentNotProvided = require("../exceptions/argument-not-provided.exception");
var _valueObject = require("./value-object.base");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
(0, _mocha.describe)('value-object.base', () => {
  (0, _mocha.it)('throws an error when has no props', () => {
    class A extends _valueObject.ValueObject {
      validate() {
        return;
      }
    }
    (0, _chai.expect)(() => new A()).to.throws(_argumentNotProvided.ArgumentNotProvidedException);
  });
  (0, _mocha.it)('validates instances', () => {
    class A extends _valueObject.ValueObject {
      validate() {
        return;
      }
    }
    const a = new A({
      value: 'foo'
    });
    (0, _chai.expect)(_valueObject.ValueObject.isValueObject(a)).to.be.true;
  });
  (0, _mocha.describe)('as primitive', () => {
    (0, _mocha.it)('validates its own props', () => {
      const spy = _sinon.default.spy();
      class A extends _valueObject.ValueObject {
        validate(props) {
          spy(props);
        }
      }
      new A({
        value: 'foo'
      });
      (0, _chai.expect)(spy).to.have.been.calledWith({
        value: 'foo'
      });
    });
    (0, _mocha.it)('has structural equality', () => {
      class A extends _valueObject.ValueObject {
        validate() {
          return;
        }
      }
      class B extends _valueObject.ValueObject {
        validate() {
          return;
        }
      }
      const a = new A({
        value: 'foo'
      });
      const b = new B({
        value: 'foo'
      });
      (0, _chai.expect)(a.equals(b)).to.be.true;
    });
    (0, _mocha.it)('is not equal to null', () => {
      class A extends _valueObject.ValueObject {
        validate() {
          return;
        }
      }
      const a = new A({
        value: 'foo'
      });
      (0, _chai.expect)(a.equals(null)).to.be.false;
    });
    (0, _mocha.it)('can be converted to string', () => {
      class A extends _valueObject.ValueObject {
        validate() {
          return;
        }
      }
      const a = new A({
        value: 'foo'
      });
      (0, _chai.expect)(a.toString()).to.be.equal('foo');
    });
    (0, _mocha.it)('can be converted to object', () => {
      class A extends _valueObject.ValueObject {
        validate() {
          return;
        }
      }
      const a = new A({
        value: 'foo'
      });
      (0, _chai.expect)(a.toJSON()).to.be.deep.equal('foo');
    });
    (0, _mocha.it)('clones itself', () => {
      class A extends _valueObject.ValueObject {
        validate() {
          return;
        }
      }
      const a = new A({
        value: 'foo'
      });
      const b = a.clone({
        value: 'bar'
      });
      (0, _chai.expect)(b.toJSON()).to.be.deep.equal('bar');
      (0, _chai.expect)(b).to.be.instanceof(A);
    });
  });
  (0, _mocha.describe)('as object', () => {
    (0, _mocha.it)('validates its own props', () => {
      const spy = _sinon.default.spy();
      class A extends _valueObject.ValueObject {
        validate(props) {
          spy(props);
        }
      }
      new A({
        foo: 'bar'
      });
      (0, _chai.expect)(spy).to.have.been.calledWith({
        foo: 'bar'
      });
    });
    (0, _mocha.it)('has structural equality', () => {
      class A extends _valueObject.ValueObject {
        validate() {
          return;
        }
      }
      class B extends _valueObject.ValueObject {
        validate() {
          return;
        }
      }
      const a = new A({
        foo: 'bar'
      });
      const b = new B({
        foo: 'bar'
      });
      (0, _chai.expect)(a.equals(b)).to.be.true;
    });
    (0, _mocha.it)('is not equal to null', () => {
      class A extends _valueObject.ValueObject {
        validate() {
          return;
        }
      }
      const a = new A({
        foo: 'bar'
      });
      (0, _chai.expect)(a.equals(null)).to.be.false;
    });
    (0, _mocha.it)('can be converted to string', () => {
      class A extends _valueObject.ValueObject {
        validate() {
          return;
        }
      }
      const a = new A({
        foo: 'bar'
      });
      (0, _chai.expect)(a.toString()).to.be.equal('{"foo":"bar"}');
    });
    (0, _mocha.it)('can be converted to object', () => {
      class A extends _valueObject.ValueObject {
        validate() {
          return;
        }
      }
      const a = new A({
        foo: 'bar'
      });
      (0, _chai.expect)(a.toJSON()).to.be.deep.equal({
        foo: 'bar'
      });
    });
    (0, _mocha.it)('clones itself', () => {
      class A extends _valueObject.ValueObject {
        validate() {
          return;
        }
      }
      const a = new A({
        foo: 'foo',
        bar: 'bar'
      });
      const b = a.clone({
        foo: 'bar'
      });
      (0, _chai.expect)(b.toJSON()).to.be.deep.equal({
        foo: 'bar',
        bar: 'bar'
      });
      (0, _chai.expect)(b).to.be.instanceof(A);
    });
  });
});
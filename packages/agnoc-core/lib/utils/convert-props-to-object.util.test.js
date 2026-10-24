"use strict";

var _chai = require("chai");
var _mocha = require("mocha");
var _convertPropsToObject = require("./convert-props-to-object.util");
(0, _mocha.describe)('convert-props-to-object.util', () => {
  (0, _mocha.it)('converts props to object', () => {
    class Foo {}
    class Serializable {
      toJSON() {
        return 'serializable';
      }
    }
    const props = {
      primitive: 'bar',
      array: [1, 2, 3],
      object: {
        foo: 'bar'
      },
      instance: new Foo(),
      serializable: new Serializable()
    };
    (0, _chai.expect)((0, _convertPropsToObject.convertPropsToObject)(props)).to.be.deep.equal({
      primitive: 'bar',
      array: [1, 2, 3],
      object: {
        foo: 'bar'
      },
      instance: {},
      serializable: 'serializable'
    });
  });
  (0, _mocha.it)('throws an error when props are not an object', () => {
    (0, _chai.expect)(() => {
      (0, _convertPropsToObject.convertPropsToObject)('foo');
    }).to.throw(TypeError);
  });
});
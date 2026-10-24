"use strict";

var _chai = require("chai");
var _mocha = require("mocha");
var _bind = require("./bind.decorator");
function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }
(0, _mocha.describe)('bind.decorator', () => {
  (0, _mocha.it)('binds a class method', () => {
    var _class;
    let Foo = (_class = class Foo {
      constructor() {
        this.wow = 1;
      }
      bar() {
        return this.wow;
      }
    }, (_applyDecoratedDescriptor(_class.prototype, "bar", [_bind.bind], Object.getOwnPropertyDescriptor(_class.prototype, "bar"), _class.prototype)), _class);
    const foo = new Foo();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const bar = foo.bar;
    (0, _chai.expect)(bar()).to.be.equal(foo.wow);
  });
  (0, _mocha.it)('throws an error when applied to a class', () => {
    (0, _chai.expect)(() => {
      var _class3;
      // @ts-expect-error bad signature
      let Foo = (0, _bind.bind)(_class3 = class Foo {}) || _class3;
      new Foo();
    }).to.throw(TypeError);
  });
});
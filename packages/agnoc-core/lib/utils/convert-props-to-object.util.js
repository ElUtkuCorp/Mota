"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.convertPropsToObject = convertPropsToObject;
var _isObject = require("./is-object.util");
function convertToRaw(item) {
  if ((0, _isObject.isObject)(item) && typeof item.toJSON === 'function') {
    return item.toJSON();
  }
  return item;
}
function convertPropsToObject(props) {
  if (!(0, _isObject.isObject)(props)) {
    throw new TypeError(`Unable to convert props type <${typeof props}> to object`);
  }
  const propsCopy = {
    ...props
  };
  for (const prop in propsCopy) {
    if (Array.isArray(propsCopy[prop])) {
      propsCopy[prop] = propsCopy[prop].map(item => {
        return convertToRaw(item);
      });
    }
    propsCopy[prop] = convertToRaw(propsCopy[prop]);
  }
  return propsCopy;
}
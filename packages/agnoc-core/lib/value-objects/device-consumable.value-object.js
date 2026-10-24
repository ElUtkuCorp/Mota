"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DeviceConsumable = exports.CONSUMABLE_TYPE = void 0;
var _valueObject = require("../base-classes/value-object.base");
var _argumentInvalid = require("../exceptions/argument-invalid.exception");
var _argumentNotProvided = require("../exceptions/argument-not-provided.exception");
var _isPresent = require("../utils/is-present.util");
const CONSUMABLE_TYPE = {
  MAIN_BRUSH: 'mainBrush',
  SIDE_BRUSH: 'sideBrush',
  FILTER: 'filter',
  DISHCLOTH: 'dishcloth'
};
exports.CONSUMABLE_TYPE = CONSUMABLE_TYPE;
class DeviceConsumable extends _valueObject.ValueObject {
  get type() {
    return this.props.type;
  }
  get used() {
    return this.props.used;
  }
  validate(props) {
    if (![props.type, props.used].every(_isPresent.isPresent)) {
      throw new _argumentNotProvided.ArgumentNotProvidedException('Missing property in device consumable constructor');
    }
    if (!Object.values(CONSUMABLE_TYPE).includes(props.type)) {
      throw new _argumentInvalid.ArgumentInvalidException('Invalid property type in device consumable constructor');
    }
  }
}
exports.DeviceConsumable = DeviceConsumable;
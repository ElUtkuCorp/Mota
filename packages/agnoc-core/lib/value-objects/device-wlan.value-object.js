"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DeviceWlan = void 0;
var _valueObject = require("../base-classes/value-object.base");
var _argumentNotProvided = require("../exceptions/argument-not-provided.exception");
var _isPresent = require("../utils/is-present.util");
class DeviceWlan extends _valueObject.ValueObject {
  get ipv4() {
    return this.props.ipv4;
  }
  get ssid() {
    return this.props.ssid;
  }
  get port() {
    return this.props.port;
  }
  get mask() {
    return this.props.mask;
  }
  get mac() {
    return this.props.mac;
  }
  validate(props) {
    if (![props.ipv4, props.ssid, props.port, props.mask, props.mac].every(_isPresent.isPresent)) {
      throw new _argumentNotProvided.ArgumentNotProvidedException('Missing property in device wlan constructor');
    }
  }
}
exports.DeviceWlan = DeviceWlan;
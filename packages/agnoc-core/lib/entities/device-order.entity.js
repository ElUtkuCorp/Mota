"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WeekDay = exports.DeviceOrder = exports.CLEAN_MODE = void 0;
var _entity = require("../base-classes/entity.base");
var _argumentInvalid = require("../exceptions/argument-invalid.exception");
var _argumentNotProvided = require("../exceptions/argument-not-provided.exception");
var _deviceFanSpeed = require("../mappers/device-fan-speed.mapper");
var _deviceWaterLevel = require("../mappers/device-water-level.mapper");
var _isPresent = require("../utils/is-present.util");
var _deviceFanSpeed2 = require("../value-objects/device-fan-speed.value-object");
var _deviceTime = require("../value-objects/device-time.value-object");
var _deviceWaterLevel2 = require("../value-objects/device-water-level.value-object");
var _id = require("../value-objects/id.value-object");
let WeekDay;
exports.WeekDay = WeekDay;
(function (WeekDay) {
  WeekDay[WeekDay["sunday"] = 1] = "sunday";
  WeekDay[WeekDay["monday"] = 2] = "monday";
  WeekDay[WeekDay["tuesday"] = 4] = "tuesday";
  WeekDay[WeekDay["wednesday"] = 8] = "wednesday";
  WeekDay[WeekDay["thursday"] = 16] = "thursday";
  WeekDay[WeekDay["friday"] = 32] = "friday";
  WeekDay[WeekDay["saturday"] = 64] = "saturday";
})(WeekDay || (exports.WeekDay = WeekDay = {}));
let CLEAN_MODE;
exports.CLEAN_MODE = CLEAN_MODE;
(function (CLEAN_MODE) {
  CLEAN_MODE[CLEAN_MODE["auto"] = 1] = "auto";
  CLEAN_MODE[CLEAN_MODE["border"] = 3] = "border";
  CLEAN_MODE[CLEAN_MODE["mop"] = 4] = "mop";
})(CLEAN_MODE || (exports.CLEAN_MODE = CLEAN_MODE = {}));
class DeviceOrder extends _entity.Entity {
  constructor(props) {
    super(props);
    this.validate(props);
  }
  get id() {
    return this.props.id;
  }
  get mapId() {
    return this.props.mapId;
  }
  get planId() {
    return this.props.planId;
  }
  get isEnabled() {
    return this.props.isEnabled;
  }
  get isRepeatable() {
    return this.props.isRepeatable;
  }
  get isDeepClean() {
    return this.props.isDeepClean;
  }
  get weekDay() {
    return this.props.weekDay;
  }
  get time() {
    return this.props.time;
  }
  get cleanMode() {
    return this.props.cleanMode;
  }
  get fanSpeed() {
    return this.props.fanSpeed;
  }
  get waterLevel() {
    return this.props.waterLevel;
  }
  static fromOrderList(orderList) {
    if (!orderList.cleanInfo) {
      throw new _argumentNotProvided.ArgumentNotProvidedException('Unable to read clean info from order list');
    }
    const time = _deviceTime.DeviceTime.fromMinutes(orderList.dayTime);
    const props = {
      id: new _id.ID(orderList.orderId),
      mapId: new _id.ID(orderList.cleanInfo.mapHeadId),
      planId: new _id.ID(orderList.cleanInfo.planId),
      isEnabled: orderList.enable,
      isRepeatable: orderList.enable,
      isDeepClean: orderList.cleanInfo.twiceClean,
      weekDay: orderList.weekDay,
      time,
      cleanMode: CLEAN_MODE[orderList.cleanInfo.cleanMode],
      fanSpeed: _deviceFanSpeed.DeviceFanSpeedMapper.toDomain(orderList.cleanInfo.windPower),
      waterLevel: orderList.cleanInfo.waterLevel ? _deviceWaterLevel.DeviceWaterLevelMapper.toDomain(orderList.cleanInfo.waterLevel) : new _deviceWaterLevel2.DeviceWaterLevel({
        value: _deviceWaterLevel2.DeviceWaterLevel.VALUE.OFF
      })
    };
    return new DeviceOrder(props);
  }
  toOrderList() {
    const orderList = {
      orderId: this.id.value,
      enable: this.isEnabled,
      repeat: this.isRepeatable,
      weekDay: this.weekDay,
      dayTime: this.time.toMinutes(),
      cleanInfo: {
        mapHeadId: this.mapId.value,
        planId: this.planId.value,
        cleanMode: CLEAN_MODE[this.cleanMode],
        windPower: _deviceFanSpeed.DeviceFanSpeedMapper.toRobot(this.fanSpeed),
        waterLevel: _deviceWaterLevel.DeviceWaterLevelMapper.toRobot(this.waterLevel),
        twiceClean: this.isDeepClean
      }
    };
    return orderList;
  }
  validate(props) {
    if (![props.id, props.mapId, props.planId, props.isEnabled, props.isRepeatable, props.isDeepClean, props.weekDay, props.time, props.cleanMode, props.fanSpeed, props.waterLevel].every(_isPresent.isPresent)) {
      throw new _argumentNotProvided.ArgumentNotProvidedException('Missing property in device order constructor');
    }
    if (!(props.id instanceof _id.ID)) {
      throw new _argumentInvalid.ArgumentInvalidException('Invalid id in device order constructor');
    }
    if (!(props.mapId instanceof _id.ID)) {
      throw new _argumentInvalid.ArgumentInvalidException('Invalid mapId in device order constructor');
    }
    if (!(props.planId instanceof _id.ID)) {
      throw new _argumentInvalid.ArgumentInvalidException('Invalid planId in device order constructor');
    }
    if (!(props.time instanceof _deviceTime.DeviceTime)) {
      throw new _argumentInvalid.ArgumentInvalidException('Invalid time in device order constructor');
    }
    if (!Object.keys(CLEAN_MODE).includes(props.cleanMode)) {
      throw new _argumentInvalid.ArgumentInvalidException('Invalid cleanMode in device order constructor');
    }
    if (!(props.fanSpeed instanceof _deviceFanSpeed2.DeviceFanSpeed)) {
      throw new _argumentInvalid.ArgumentInvalidException('Invalid property fanSpeed in device order constructor');
    }
    if (!(props.waterLevel instanceof _deviceWaterLevel2.DeviceWaterLevel)) {
      throw new _argumentInvalid.ArgumentInvalidException('Invalid property waterLevel in device order constructor');
    }
  }
}
exports.DeviceOrder = DeviceOrder;
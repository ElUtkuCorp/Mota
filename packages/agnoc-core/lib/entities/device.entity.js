"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Device = void 0;
var _entity = require("../base-classes/entity.base");
var _argumentNotProvided = require("../exceptions/argument-not-provided.exception");
var _isPresent = require("../utils/is-present.util");
class Device extends _entity.Entity {
  constructor(props) {
    super({
      hasWaitingMap: false,
      ...props
    });
    this.validate(props);
  }
  get system() {
    return this.props.system;
  }
  get version() {
    return this.props.version;
  }
  get config() {
    return this.props.config;
  }
  get currentClean() {
    return this.props.currentClean;
  }
  get orders() {
    return this.props.orders;
  }
  get consumables() {
    return this.props.consumables;
  }
  get map() {
    return this.props.map;
  }
  get wlan() {
    return this.props.wlan;
  }
  get battery() {
    return this.props.battery;
  }
  get state() {
    return this.props.state;
  }
  get mode() {
    return this.props.mode;
  }
  get error() {
    return this.props.error;
  }
  get fanSpeed() {
    return this.props.fanSpeed;
  }
  get waterLevel() {
    return this.props.waterLevel;
  }
  get hasMopAttached() {
    return this.props.hasMopAttached;
  }
  get hasWaitingMap() {
    return this.props.hasWaitingMap;
  }
  updateSystem(system) {
    this.props.system = system;
  }
  updateVersion(version) {
    this.props.version = version;
  }
  updateConfig(config) {
    this.props.config = config;
  }
  updateCurrentClean(currentClean) {
    this.props.currentClean = currentClean;
  }
  updateOrders(orders) {
    this.props.orders = orders;
  }
  updateConsumables(consumables) {
    this.props.consumables = consumables;
  }
  updateMap(map) {
    this.props.map = map;
  }
  updateWlan(wlan) {
    this.props.wlan = wlan;
  }
  updateBattery(battery) {
    this.props.battery = battery;
  }
  updateState(state) {
    this.props.state = state;
  }
  updateMode(mode) {
    this.props.mode = mode;
  }
  updateError(error) {
    this.props.error = error;
  }
  updateFanSpeed(fanSpeed) {
    this.props.fanSpeed = fanSpeed;
  }
  updateWaterLevel(waterLevel) {
    this.props.waterLevel = waterLevel;
  }
  updateHasMopAttached(value) {
    this.props.hasMopAttached = value;
  }
  updateHasWaitingMap(value) {
    this.props.hasWaitingMap = value;
  }
  validate(props) {
    if (![props.system, props.version].every(_isPresent.isPresent)) {
      throw new _argumentNotProvided.ArgumentNotProvidedException('Missing property in device constructor');
    }
  }
}
exports.Device = Device;
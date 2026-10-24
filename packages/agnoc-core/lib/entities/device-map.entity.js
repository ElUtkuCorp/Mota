"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DeviceMap = void 0;
var _entity = require("../base-classes/entity.base");
var _argumentInvalid = require("../exceptions/argument-invalid.exception");
var _argumentNotProvided = require("../exceptions/argument-not-provided.exception");
var _isPresent = require("../utils/is-present.util");
var _coordinate = require("../value-objects/coordinate.value-object");
var _id = require("../value-objects/id.value-object");
var _pixel = require("../value-objects/pixel.value-object");
class DeviceMap extends _entity.Entity {
  constructor(props) {
    super(props);
    this.validate(props);
  }
  get id() {
    return this.props.id;
  }
  get size() {
    return this.props.size;
  }
  get min() {
    return this.props.min;
  }
  get max() {
    return this.props.max;
  }
  get resolution() {
    return this.props.resolution;
  }
  get grid() {
    return this.props.grid;
  }
  get robot() {
    return this.props.robot;
  }
  get charger() {
    return this.props.charger;
  }
  get rooms() {
    return this.props.rooms;
  }
  get restrictedZones() {
    return this.props.restrictedZones;
  }
  get currentSpot() {
    return this.props.currentSpot;
  }
  get robotPath() {
    return this.props.robotPath;
  }
  updateRobot(robot) {
    this.props.robot = robot;
  }
  updateCharger(charger) {
    this.props.charger = charger;
  }
  updateRestrictedZones(restrictedZones) {
    this.props.restrictedZones = restrictedZones;
  }
  updateRooms(rooms) {
    this.props.rooms = rooms;
  }
  updateCurrentSpot(currentSpot) {
    this.props.currentSpot = currentSpot;
  }
  updateRobotPath(robotPath) {
    this.props.robotPath = robotPath;
  }
  toPixel(pos) {
    return new _pixel.Pixel({
      x: Math.floor((pos.x - this.min.x) * this.size.x / (this.max.x - this.min.x)),
      y: Math.floor((pos.y - this.min.y) * this.size.y / (this.max.y - this.min.y))
    });
  }
  toCoordinate(pos) {
    return new _coordinate.Coordinate({
      x: pos.x / this.size.x * (this.max.x - this.min.x) + this.min.x,
      y: pos.y / this.size.y * (this.max.y - this.min.y) + this.min.y
    });
  }
  validate(props) {
    if (![props.id, props.size, props.min, props.max, props.grid, props.rooms, props.restrictedZones].every(_isPresent.isPresent)) {
      throw new _argumentNotProvided.ArgumentNotProvidedException('Missing property in device map constructor');
    }
    if (!(props.id instanceof _id.ID)) {
      throw new _argumentInvalid.ArgumentInvalidException('Invalid id in device map constructor');
    }
    if (!Array.isArray(props.rooms)) {
      throw new _argumentInvalid.ArgumentInvalidException('Invalid rooms in device map constructor');
    }
    if (!Array.isArray(props.restrictedZones)) {
      throw new _argumentInvalid.ArgumentInvalidException('Invalid restricted zones in device map constructor');
    }
  }
}
exports.DeviceMap = DeviceMap;
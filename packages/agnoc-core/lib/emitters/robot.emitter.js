"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Robot = exports.MANUAL_MODE = void 0;
var _tinyTypedEmitter = require("tiny-typed-emitter");
var _bind = require("../decorators/bind.decorator");
var _deviceMap = require("../entities/device-map.entity");
var _deviceOrder = require("../entities/device-order.entity");
var _room = require("../entities/room.entity");
var _zone = require("../entities/zone.entity");
var _argumentInvalid = require("../exceptions/argument-invalid.exception");
var _domain = require("../exceptions/domain.exception");
var _deviceBattery = require("../mappers/device-battery.mapper");
var _deviceError = require("../mappers/device-error.mapper");
var _deviceFanSpeed = require("../mappers/device-fan-speed.mapper");
var _deviceMode = require("../mappers/device-mode.mapper");
var _deviceState = require("../mappers/device-state.mapper");
var _deviceVoice = require("../mappers/device-voice.mapper");
var _deviceWaterLevel = require("../mappers/device-water-level.mapper");
var _bufferWriter = require("../streams/buffer-writer.stream");
var _debug = require("../utils/debug.util");
var _isPresent = require("../utils/is-present.util");
var _stream = require("../utils/stream.util");
var _waitFor = require("../utils/wait-for.util");
var _coordinate = require("../value-objects/coordinate.value-object");
var _deviceConfig = require("../value-objects/device-config.value-object");
var _deviceConsumable = require("../value-objects/device-consumable.value-object");
var _deviceCurrentClean = require("../value-objects/device-current-clean.value-object");
var _deviceMode2 = require("../value-objects/device-mode.value-object");
var _deviceQuietHours = require("../value-objects/device-quiet-hours.value-object");
var _deviceState2 = require("../value-objects/device-state.value-object");
var _deviceSystem = require("../value-objects/device-system.value-object");
var _deviceTime = require("../value-objects/device-time.value-object");
var _deviceVersion = require("../value-objects/device-version.value-object");
var _deviceWlan = require("../value-objects/device-wlan.value-object");
var _id = require("../value-objects/id.value-object");
var _pixel = require("../value-objects/pixel.value-object");
var _position = require("../value-objects/position.value-object");
var _class;
function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }
let MANUAL_MODE;
exports.MANUAL_MODE = MANUAL_MODE;
(function (MANUAL_MODE) {
  MANUAL_MODE[MANUAL_MODE["forward"] = 1] = "forward";
  MANUAL_MODE[MANUAL_MODE["left"] = 2] = "left";
  MANUAL_MODE[MANUAL_MODE["right"] = 3] = "right";
  MANUAL_MODE[MANUAL_MODE["backward"] = 4] = "backward";
  MANUAL_MODE[MANUAL_MODE["stop"] = 5] = "stop";
  MANUAL_MODE[MANUAL_MODE["init"] = 10] = "init";
})(MANUAL_MODE || (exports.MANUAL_MODE = MANUAL_MODE = {}));
const MODE_CHANGE_TIMEOUT = 5000;
const RECV_TIMEOUT = 5000;
const CONSUMABLE_TYPE_RESET = {
  [_deviceConsumable.CONSUMABLE_TYPE.MAIN_BRUSH]: 1,
  [_deviceConsumable.CONSUMABLE_TYPE.SIDE_BRUSH]: 2,
  [_deviceConsumable.CONSUMABLE_TYPE.FILTER]: 3,
  [_deviceConsumable.CONSUMABLE_TYPE.DISHCLOTH]: 4
};
// Mota: orden de control (petición, respuesta) de los modos que tienen la suya propia
function getMotaCtrlOpcode(modeValue) {
  switch (modeValue) {
    case _deviceMode2.DeviceMode.VALUE.EDGE:
      return ['DEVICE_EDGE_CLEAN_REQ', 'DEVICE_EDGE_CLEAN_RSP'];
    case _deviceMode2.DeviceMode.VALUE.SPIRAL:
      return ['DEVICE_SPIRAL_CLEAN_REQ', 'DEVICE_SPIRAL_CLEAN_RSP'];
    case _deviceMode2.DeviceMode.VALUE.MOP:
      return ['DEVICE_MOP_FLOOR_CLEAN_REQ', 'DEVICE_MOP_FLOOR_CLEAN_RSP'];
  }
  return undefined;
}
const CTRL_VALUE = {
  STOP: 0,
  START: 1,
  PAUSE: 2
};
let Robot = (_class = class Robot extends _tinyTypedEmitter.TypedEmitter {
  constructor({
    device,
    user,
    multiplexer
  }) {
    super();
    this.device = void 0;
    this.user = void 0;
    this.multiplexer = void 0;
    this.debug = void 0;
    this.handlers = {
      CLIENT_HEARTBEAT_REQ: this.handleClientHeartbeat,
      DEVICE_MAPID_GET_GLOBAL_INFO_RSP: this.handleMapUpdate,
      DEVICE_MAPID_PUSH_CHARGE_POSITION_INFO: this.handleUpdateChargePosition,
      DEVICE_MAPID_PUSH_MAP_INFO: this.handleMapUpdate,
      DEVICE_MAPID_PUSH_POSITION_INFO: this.handleUpdateRobotPosition,
      DEVICE_MAPID_WORK_STATUS_PUSH_REQ: this.handleDeviceStatus,
      DEVICE_VERSION_INFO_UPDATE_REQ: this.handleDeviceVersionInfoUpdate,
      PUSH_DEVICE_AGENT_SETTING_REQ: this.handleDeviceAgentSetting,
      PUSH_DEVICE_BATTERY_INFO_REQ: this.handleDeviceBatteryInfo,
      PUSH_DEVICE_PACKAGE_UPGRADE_INFO_REQ: this.handleDevicePackageUpgrade,
      DEVICE_MAPID_PUSH_HAS_WAITING_BE_SAVED: this.handleWaitingMap,
      DEVICE_WORKSTATUS_REPORT_REQ: this.handleWorkstatusReport,
      DEVICE_EVENT_REPORT_CLEANTASK: this.handleReportCleantask,
      DEVICE_EVENT_REPORT_CLEANMAP: this.handleReportCleanmap,
      DEVICE_CLEANMAP_BINDATA_REPORT_REQ: this.handleBinDataReport,
      DEVICE_EVENT_REPORT_REQ: this.handleEventReport,
      DEVICE_SETTIME_REQ: this.handleSetTime
    };
    this.device = device;
    this.user = user;
    this.multiplexer = multiplexer;
    this.debug = (0, _debug.debug)(__filename).extend(this.device.id.toString());
    this.debug('new robot');
  }
  get isConnected() {
    return this.multiplexer.hasConnections;
  }
  async start() {
    var _this$device$mode, _this$device$mode2, _this$device$mode3, _this$device$mode4, _this$device$mode5, _this$device$map;
    // Mota: la 3090 no informa de si la mopa está puesta (hasMopAttached siempre es falso), así
    // que no se cambia el modo automáticamente: se reanuda el modo en curso (bordes, espiral, fregado...)
    const motaCtrlOpcode = getMotaCtrlOpcode((_this$device$mode = this.device.mode) === null || _this$device$mode === void 0 ? void 0 : _this$device$mode.value);
    if (motaCtrlOpcode) {
      await this.sendRecv(motaCtrlOpcode[0], motaCtrlOpcode[1], {
        ctrlValue: CTRL_VALUE.START
      });
      return;
    }
    void _this$device$mode2;
    if (((_this$device$mode3 = this.device.mode) === null || _this$device$mode3 === void 0 ? void 0 : _this$device$mode3.value) === _deviceMode2.DeviceMode.VALUE.ZONE) {
      await this.sendRecv('DEVICE_AREA_CLEAN_REQ', 'DEVICE_AREA_CLEAN_RSP', {
        ctrlValue: CTRL_VALUE.START
      });
    } else if (((_this$device$mode4 = this.device.mode) === null || _this$device$mode4 === void 0 ? void 0 : _this$device$mode4.value) === _deviceMode2.DeviceMode.VALUE.MOP) {
      await this.sendRecv('DEVICE_MOP_FLOOR_CLEAN_REQ', 'DEVICE_MOP_FLOOR_CLEAN_RSP', {
        ctrlValue: CTRL_VALUE.START
      });
    } else if (((_this$device$mode5 = this.device.mode) === null || _this$device$mode5 === void 0 ? void 0 : _this$device$mode5.value) === _deviceMode2.DeviceMode.VALUE.SPOT && (_this$device$map = this.device.map) !== null && _this$device$map !== void 0 && _this$device$map.currentSpot) {
      await this.sendRecv('DEVICE_MAPID_SET_NAVIGATION_REQ', 'DEVICE_MAPID_SET_NAVIGATION_RSP', {
        mapHeadId: this.device.map.id.value,
        poseX: this.device.map.currentSpot.x,
        poseY: this.device.map.currentSpot.y,
        posePhi: this.device.map.currentSpot.phi,
        ctrlValue: CTRL_VALUE.START
      });
    } else {
      var _this$device$state;
      if (this.device.system.supports(_deviceSystem.DEVICE_CAPABILITY.MAP_PLANS) && ((_this$device$state = this.device.state) === null || _this$device$state === void 0 ? void 0 : _this$device$state.value) === _deviceState2.DeviceState.VALUE.DOCKED && this.device.map) {
        const {
          id,
          restrictedZones
        } = this.device.map;
        await this.sendRecv('DEVICE_MAPID_SET_PLAN_PARAMS_REQ', 'DEVICE_MAPID_SET_PLAN_PARAMS_RSP', {
          mapHeadId: id.value,
          // FIXME: this will change user map name.
          mapName: 'Default',
          planId: 2,
          // FIXME: this will change user plan name.
          planName: 'Default',
          roomList: this.device.map.rooms.map(room => ({
            roomId: room.id.value,
            roomName: room.name,
            enable: true
          })),
          areaInfo: {
            mapHeadId: id.value,
            planId: 2,
            cleanAreaLength: restrictedZones.length,
            cleanAreaList: restrictedZones.map(zone => ({
              cleanAreaId: zone.id.value,
              type: 0,
              coordinateLength: zone.coordinates.length,
              coordinateList: zone.coordinates.map(({
                x,
                y
              }) => ({
                x,
                y
              }))
            }))
          }
        });
      }
      await this.sendRecv('DEVICE_AUTO_CLEAN_REQ', 'DEVICE_AUTO_CLEAN_RSP', {
        ctrlValue: CTRL_VALUE.START,
        cleanType: 2
      });
    }
  }
  async pause() {
    var _this$device$mode6, _this$device$mode7, _this$device$mode8, _this$device$map2;
    // Mota: bordes y espiral
    const motaCtrlOpcode = getMotaCtrlOpcode(this.device.mode && this.device.mode.value);
    if (motaCtrlOpcode && motaCtrlOpcode[0] !== 'DEVICE_MOP_FLOOR_CLEAN_REQ') {
      await this.sendRecv(motaCtrlOpcode[0], motaCtrlOpcode[1], {
        ctrlValue: CTRL_VALUE.PAUSE
      });
      return;
    }
    if (((_this$device$mode6 = this.device.mode) === null || _this$device$mode6 === void 0 ? void 0 : _this$device$mode6.value) === _deviceMode2.DeviceMode.VALUE.ZONE) {
      await this.sendRecv('DEVICE_AREA_CLEAN_REQ', 'DEVICE_AREA_CLEAN_RSP', {
        ctrlValue: CTRL_VALUE.PAUSE
      });
    } else if (((_this$device$mode7 = this.device.mode) === null || _this$device$mode7 === void 0 ? void 0 : _this$device$mode7.value) === _deviceMode2.DeviceMode.VALUE.MOP) {
      await this.sendRecv('DEVICE_MOP_FLOOR_CLEAN_REQ', 'DEVICE_MOP_FLOOR_CLEAN_RSP', {
        ctrlValue: CTRL_VALUE.PAUSE
      });
    } else if (((_this$device$mode8 = this.device.mode) === null || _this$device$mode8 === void 0 ? void 0 : _this$device$mode8.value) === _deviceMode2.DeviceMode.VALUE.SPOT && (_this$device$map2 = this.device.map) !== null && _this$device$map2 !== void 0 && _this$device$map2.currentSpot) {
      await this.sendRecv('DEVICE_MAPID_SET_NAVIGATION_REQ', 'DEVICE_MAPID_SET_NAVIGATION_RSP', {
        mapHeadId: this.device.map.id.value,
        poseX: this.device.map.currentSpot.x,
        poseY: this.device.map.currentSpot.y,
        posePhi: this.device.map.currentSpot.phi,
        ctrlValue: CTRL_VALUE.PAUSE
      });
    } else {
      await this.sendRecv('DEVICE_AUTO_CLEAN_REQ', 'DEVICE_AUTO_CLEAN_RSP', {
        ctrlValue: CTRL_VALUE.PAUSE,
        cleanType: 2
      });
    }
  }
  async stop() {
    // Mota: bordes, espiral y fregado se paran con su propia orden
    const motaCtrlOpcode = getMotaCtrlOpcode(this.device.mode && this.device.mode.value);
    if (motaCtrlOpcode) {
      await this.sendRecv(motaCtrlOpcode[0], motaCtrlOpcode[1], {
        ctrlValue: CTRL_VALUE.STOP
      });
      return;
    }
    await this.sendRecv('DEVICE_AUTO_CLEAN_REQ', 'DEVICE_AUTO_CLEAN_RSP', {
      ctrlValue: CTRL_VALUE.STOP,
      cleanType: 2
    });
    if (this.device.system.supports(_deviceSystem.DEVICE_CAPABILITY.MAP_PLANS) && this.device.map) {
      const {
        id,
        restrictedZones
      } = this.device.map;
      await this.sendRecv('DEVICE_MAPID_SET_PLAN_PARAMS_REQ', 'DEVICE_MAPID_SET_PLAN_PARAMS_RSP', {
        mapHeadId: id.value,
        // FIXME: this will change user map name.
        mapName: 'Default',
        planId: 2,
        // FIXME: this will change user plan name.
        planName: 'Default',
        roomList: this.device.map.rooms.map(room => ({
          roomId: room.id.value,
          roomName: room.name,
          enable: true
        })),
        areaInfo: {
          mapHeadId: id.value,
          planId: 2,
          cleanAreaLength: restrictedZones.length,
          cleanAreaList: restrictedZones.map(zone => ({
            cleanAreaId: zone.id.value,
            type: 0,
            coordinateLength: zone.coordinates.length,
            coordinateList: zone.coordinates.map(({
              x,
              y
            }) => ({
              x,
              y
            }))
          }))
        }
      });
      await this.updateMap();
    }
  }
  async home() {
    await this.sendRecv('DEVICE_CHARGE_REQ', 'DEVICE_CHARGE_RSP', {
      enable: 1
    });
  }
  async locate() {
    await this.sendRecv('DEVICE_SEEK_LOCATION_REQ', 'DEVICE_SEEK_LOCATION_RSP', {});
  }
  async setMode(mode) {
    if (mode.value === _deviceMode2.DeviceMode.VALUE.NONE) {
      await this.sendRecv('DEVICE_AUTO_CLEAN_REQ', 'DEVICE_AUTO_CLEAN_RSP', {
        ctrlValue: CTRL_VALUE.STOP,
        cleanType: 2
      });
    } else if (mode.value === _deviceMode2.DeviceMode.VALUE.SPOT) {
      let mask = 0x78ff | 0x200;
      if (!this.device.system.supports(_deviceSystem.DEVICE_CAPABILITY.MAP_PLANS)) {
        mask = 0xff | 0x200;
      }
      await this.sendRecv('DEVICE_MAPID_GET_GLOBAL_INFO_REQ', 'DEVICE_MAPID_GET_GLOBAL_INFO_RSP', {
        mask
      });
    } else if (mode.value === _deviceMode2.DeviceMode.VALUE.ZONE) {
      await this.sendRecv('DEVICE_AREA_CLEAN_REQ', 'DEVICE_AREA_CLEAN_RSP', {
        ctrlValue: CTRL_VALUE.STOP
      });
      let mask = 0x78ff | 0x100;
      if (!this.device.system.supports(_deviceSystem.DEVICE_CAPABILITY.MAP_PLANS)) {
        mask = 0xff | 0x100;
      }
      await this.sendRecv('DEVICE_MAPID_GET_GLOBAL_INFO_REQ', 'DEVICE_MAPID_GET_GLOBAL_INFO_RSP', {
        mask
      });
    } else if (mode.value === _deviceMode2.DeviceMode.VALUE.MOP) {
      await this.sendRecv('DEVICE_MAPID_INTO_MODEIDLE_INFO_REQ', 'DEVICE_MAPID_INTO_MODEIDLE_INFO_RSP', {
        mode: 7
      });
    } else {
      throw new _argumentInvalid.ArgumentInvalidException('Unknown device mode');
    }
    await (0, _waitFor.waitFor)(() => {
      var _this$device$mode9;
      return ((_this$device$mode9 = this.device.mode) === null || _this$device$mode9 === void 0 ? void 0 : _this$device$mode9.value) === mode.value;
    }, {
      timeout: MODE_CHANGE_TIMEOUT
    }).catch(() => {
      throw new _domain.DomainException(`Unable to change robot mode to ${mode.value}`);
    });
  }
  async setFanSpeed(fanSpeed) {
    await this.sendRecv('DEVICE_SET_CLEAN_PREFERENCE_REQ', 'DEVICE_SET_CLEAN_PREFERENCE_RSP', {
      mode: _deviceFanSpeed.DeviceFanSpeedMapper.toRobot(fanSpeed)
    });
  }
  async setWaterLevel(waterLevel) {
    await this.sendRecv('DEVICE_SET_CLEAN_PREFERENCE_REQ', 'DEVICE_SET_CLEAN_PREFERENCE_RSP', {
      mode: _deviceWaterLevel.DeviceWaterLevelMapper.toRobot(waterLevel)
    });
  }
  async getTime() {
    const packet = await this.sendRecv('DEVICE_GETTIME_REQ', 'DEVICE_GETTIME_RSP', {});
    const object = packet.payload.object;
    return {
      timestamp: object.body.deviceTime * 1000,
      offset: -1 * ((object.body.deviceTimezone || 0) / 60)
    };
  }
  async getConsumables() {
    if (!this.device.system.supports(_deviceSystem.DEVICE_CAPABILITY.CONSUMABLES)) {
      return [];
    }
    const packet = await this.sendRecv('DEVICE_MAPID_GET_CONSUMABLES_PARAM_REQ', 'DEVICE_MAPID_GET_CONSUMABLES_PARAM_RSP', {});
    const object = packet.payload.object;
    const consumables = [new _deviceConsumable.DeviceConsumable({
      type: _deviceConsumable.CONSUMABLE_TYPE.MAIN_BRUSH,
      used: object.mainBrushTime
    }), new _deviceConsumable.DeviceConsumable({
      type: _deviceConsumable.CONSUMABLE_TYPE.SIDE_BRUSH,
      used: object.sideBrushTime
    }), new _deviceConsumable.DeviceConsumable({
      type: _deviceConsumable.CONSUMABLE_TYPE.FILTER,
      used: object.filterTime
    }), new _deviceConsumable.DeviceConsumable({
      type: _deviceConsumable.CONSUMABLE_TYPE.DISHCLOTH,
      used: object.dishclothTime
    })];
    this.device.updateConsumables(consumables);
    return consumables;
  }
  async resetConsumable(consumable) {
    if (!(consumable in CONSUMABLE_TYPE_RESET)) {
      throw new _argumentInvalid.ArgumentInvalidException('Invalid consumable');
    }
    const itemId = CONSUMABLE_TYPE_RESET[consumable];
    await this.sendRecv('DEVICE_MAPID_SET_CONSUMABLES_PARAM_REQ', 'DEVICE_MAPID_SET_CONSUMABLES_PARAM_RSP', {
      itemId
    });
  }
  async updateMap() {
    let mask = 0x78ff;
    if (!this.device.system.supports(_deviceSystem.DEVICE_CAPABILITY.MAP_PLANS)) {
      mask = 0xff;
    }
    await this.sendRecv('DEVICE_MAPID_GET_GLOBAL_INFO_REQ', 'DEVICE_MAPID_GET_GLOBAL_INFO_RSP', {
      mask
    });
  }
  async getWlan() {
    const packet = await this.sendRecv('DEVICE_WLAN_INFO_GETTING_REQ', 'DEVICE_WLAN_INFO_GETTING_RSP', {});
    const object = packet.payload.object;
    this.device.updateWlan(new _deviceWlan.DeviceWlan(object.body));
    this.emit('updateDevice');
    return this.device.wlan;
  }
  async enterManualMode() {
    // TODO: make a stop if robot is not stopped
    await this.sendRecv('DEVICE_MANUAL_CTRL_REQ', 'DEVICE_MANUAL_CTRL_RSP', {
      command: MANUAL_MODE.init
    });
  }
  async leaveManualMode() {
    await this.sendRecv('DEVICE_AUTO_CLEAN_REQ', 'DEVICE_AUTO_CLEAN_RSP', {
      ctrlValue: CTRL_VALUE.STOP,
      cleanType: 2
    });
  }
  async setManualMode(command) {
    await this.sendRecv('DEVICE_MANUAL_CTRL_REQ', 'DEVICE_MANUAL_CTRL_RSP', {
      command
    });
  }
  async getOrders() {
    var _object$orderList;
    const packet = await this.sendRecv('DEVICE_ORDERLIST_GETTING_REQ', 'DEVICE_ORDERLIST_GETTING_RSP', {});
    const object = packet.payload.object;
    const orders = ((_object$orderList = object.orderList) === null || _object$orderList === void 0 ? void 0 : _object$orderList.map(_deviceOrder.DeviceOrder.fromOrderList)) || [];
    this.device.updateOrders(orders);
    return orders;
  }
  async setOrder(order) {
    const orderList = order.toOrderList();
    await this.sendRecv('DEVICE_ORDERLIST_SETTING_REQ', 'DEVICE_ORDERLIST_SETTING_RSP', orderList);
  }
  async deleteOrder(order) {
    await this.sendRecv('DEVICE_ORDERLIST_DELETE_REQ', 'DEVICE_ORDERLIST_DELETE_RSP', {
      orderId: order.id.value,
      mode: 1
    });
  }
  async cleanPosition(position) {
    var _this$device$mode10;
    if (!this.device.map) {
      throw new _domain.DomainException('Unable to set robot position: map not loaded');
    }
    if (((_this$device$mode10 = this.device.mode) === null || _this$device$mode10 === void 0 ? void 0 : _this$device$mode10.value) !== _deviceMode2.DeviceMode.VALUE.SPOT) {
      await this.setMode(new _deviceMode2.DeviceMode({
        value: _deviceMode2.DeviceMode.VALUE.SPOT
      }));
    }
    await this.sendRecv('DEVICE_MAPID_SET_NAVIGATION_REQ', 'DEVICE_MAPID_SET_NAVIGATION_RSP', {
      mapHeadId: this.device.map.id.value,
      poseX: position.x,
      poseY: position.y,
      posePhi: position.phi,
      ctrlValue: CTRL_VALUE.START
    });
  }

  /**
   * A ┌───┐ D
   *   │   │
   * B └───┘ C
   */
  async cleanAreas(areas) {
    var _this$device$mode11;
    if (!this.device.map) {
      return;
    }
    if (((_this$device$mode11 = this.device.mode) === null || _this$device$mode11 === void 0 ? void 0 : _this$device$mode11.value) !== _deviceMode2.DeviceMode.VALUE.ZONE) {
      await this.setMode(new _deviceMode2.DeviceMode({
        value: _deviceMode2.DeviceMode.VALUE.ZONE
      }));
    }
    const req = {
      mapHeadId: this.device.map.id.value,
      planId: 0,
      cleanAreaLength: areas.length,
      cleanAreaList: areas.map(coords => {
        return {
          cleanAreaId: _id.ID.generate().value,
          type: 0,
          coordinateLength: coords.length,
          coordinateList: coords
        };
      })
    };
    await this.sendRecv('DEVICE_MAPID_SET_AREA_CLEAN_INFO_REQ', 'DEVICE_MAPID_SET_AREA_CLEAN_INFO_RSP', req);
    await this.sendRecv('DEVICE_AREA_CLEAN_REQ', 'DEVICE_AREA_CLEAN_RSP', {
      ctrlValue: CTRL_VALUE.START
    });
  }

  /**
   * A ┌───┐ D
   *   │   │
   * B └───┘ C
   */
  async setRestrictedZones(areas) {
    if (!this.device.map) {
      return;
    }
    if (!areas.length) {
      areas.push([]);
    }
    if (!this.device.system.supports(_deviceSystem.DEVICE_CAPABILITY.MAP_PLANS)) {
      await this.sendRecv('DEVICE_MAPID_GET_GLOBAL_INFO_REQ', 'DEVICE_MAPID_GET_GLOBAL_INFO_RSP', {
        mask: 0xff | 0x400
      });
    }
    const cleanAreaList = [...areas.map(coords => ({
      cleanAreaId: _id.ID.generate().value,
      type: 0,
      coordinateLength: coords.length,
      coordinateList: coords
    })), ...this.device.map.restrictedZones.map(zone => ({
      cleanAreaId: zone.id.value,
      type: 0,
      coordinateLength: 0,
      coordinateList: []
    }))];
    await this.sendRecv('DEVICE_MAPID_SET_AREA_RESTRICTED_INFO_REQ', 'DEVICE_MAPID_SET_AREA_RESTRICTED_INFO_RSP', {
      mapHeadId: this.device.map.id.value,
      planId: 0,
      cleanAreaLength: cleanAreaList.length,
      cleanAreaList
    });
  }
  async getQuietHours() {
    var _this$device$config;
    const packet = await this.sendRecv('USER_GET_DEVICE_QUIETHOURS_REQ', 'USER_GET_DEVICE_QUIETHOURS_RSP', {});
    const object = packet.payload.object;
    const quietHours = new _deviceQuietHours.DeviceQuietHours({
      isEnabled: object.isOpen,
      begin: _deviceTime.DeviceTime.fromMinutes(object.beginTime),
      end: _deviceTime.DeviceTime.fromMinutes(object.endTime)
    });
    (_this$device$config = this.device.config) === null || _this$device$config === void 0 ? void 0 : _this$device$config.updateQuietHours(quietHours);
    return quietHours;
  }
  async setQuietHours(quietHours) {
    var _this$device$config2;
    await this.sendRecv('USER_SET_DEVICE_QUIETHOURS_REQ', 'USER_SET_DEVICE_QUIETHOURS_RSP', {
      isOpen: quietHours.isEnabled,
      beginTime: quietHours.begin.toMinutes(),
      endTime: quietHours.end.toMinutes()
    });
    (_this$device$config2 = this.device.config) === null || _this$device$config2 === void 0 ? void 0 : _this$device$config2.updateQuietHours(quietHours);
  }
  async setCarpetMode(enable) {
    var _this$device$config3;
    await this.sendRecv('USER_SET_DEVICE_CLEANPREFERENCE_REQ', 'USER_SET_DEVICE_CLEANPREFERENCE_RSP', {
      carpetTurbo: enable
    });
    (_this$device$config3 = this.device.config) === null || _this$device$config3 === void 0 ? void 0 : _this$device$config3.updateCarpetMode(enable);
    this.emit('updateDevice');
  }
  async setHistoryMap(enable) {
    var _this$device$config4;
    await this.sendRecv('USER_SET_DEVICE_CLEANPREFERENCE_REQ', 'USER_SET_DEVICE_CLEANPREFERENCE_RSP', {
      historyMap: enable
    });
    (_this$device$config4 = this.device.config) === null || _this$device$config4 === void 0 ? void 0 : _this$device$config4.updateHistoryMap(enable);
    this.emit('updateDevice');
  }
  async setVoice(voice) {
    var _this$device$config5;
    const robotVoice = _deviceVoice.DeviceVoiceMapper.toRobot(voice);
    await this.sendRecv('USER_SET_DEVICE_CTRL_SETTING_REQ', 'USER_SET_DEVICE_CTRL_SETTING_RSP', {
      voiceMode: robotVoice.isEnabled,
      volume: robotVoice.volume
    });
    (_this$device$config5 = this.device.config) === null || _this$device$config5 === void 0 ? void 0 : _this$device$config5.updateVoice(voice);
    this.emit('updateDevice');
  }
  async saveWaitingMap(save) {
    await this.sendRecv('DEVICE_MAPID_SET_SAVEWAITINGMAP_INFO_REQ', 'DEVICE_MAPID_SET_SAVEWAITINGMAP_INFO_RSP', {
      mode: Number(save)
    });
    this.device.updateHasWaitingMap(false);
  }
  async updateRoom(room) {
    if (!this.device.map) {
      return;
    }
    const {
      id,
      restrictedZones
    } = this.device.map;
    await this.sendRecv('DEVICE_MAPID_SET_PLAN_PARAMS_REQ', 'DEVICE_MAPID_SET_PLAN_PARAMS_RSP', {
      mapHeadId: id.value,
      // FIXME: this will change user map name.
      mapName: 'Default',
      planId: 2,
      // FIXME: this will change user plan name.
      planName: 'Default',
      roomList: this.device.map.rooms.map(r => {
        r = room.equals(r) ? room : r;
        return {
          roomId: r.id.value,
          roomName: r.name,
          enable: true
        };
      }),
      areaInfo: {
        mapHeadId: id.value,
        planId: 2,
        cleanAreaLength: restrictedZones.length,
        cleanAreaList: restrictedZones.map(zone => ({
          cleanAreaId: zone.id.value,
          type: 0,
          coordinateLength: zone.coordinates.length,
          coordinateList: zone.coordinates.map(({
            x,
            y
          }) => ({
            x,
            y
          }))
        }))
      }
    });
  }
  async joinRooms(rooms) {
    if (!this.device.map) {
      return;
    }
    const stream = new _bufferWriter.BufferWriter();
    (0, _stream.writeByte)(stream, 1);
    (0, _stream.writeByte)(stream, rooms.length);
    rooms.forEach(room => {
      (0, _stream.writeByte)(stream, room.id.value);
    });
    const data = stream.buffer;
    await this.sendRecv('DEVICE_MAPID_SET_ARRANGEROOM_INFO_REQ', 'DEVICE_MAPID_SET_ARRANGEROOM_INFO_RSP', {
      mapHeadId: this.device.map.id.value,
      type: 0,
      dataLen: data.length,
      data,
      roomId: 0
    });
  }
  async splitRoom(room, pointA, pointB) {
    if (!this.device.map) {
      return;
    }
    const stream = new _bufferWriter.BufferWriter();
    (0, _stream.writeByte)(stream, 1);
    (0, _stream.writeByte)(stream, 1);
    (0, _stream.writeByte)(stream, 2);
    (0, _stream.writeFloat)(stream, pointA.x);
    (0, _stream.writeFloat)(stream, pointA.y);
    (0, _stream.writeFloat)(stream, pointB.x);
    (0, _stream.writeFloat)(stream, pointB.y);
    const data = stream.buffer;
    await this.sendRecv('DEVICE_MAPID_SET_ARRANGEROOM_INFO_REQ', 'DEVICE_MAPID_SET_ARRANGEROOM_INFO_RSP', {
      mapHeadId: this.device.map.id.value,
      type: 1,
      dataLen: data.length,
      data,
      roomId: room.id.value
    });
  }
  async cleanRooms(rooms) {
    if (!this.device.map) {
      return;
    }
    const {
      id,
      restrictedZones
    } = this.device.map;
    await this.sendRecv('DEVICE_MAPID_SET_PLAN_PARAMS_REQ', 'DEVICE_MAPID_SET_PLAN_PARAMS_RSP', {
      mapHeadId: id.value,
      // FIXME: this will change user map name.
      mapName: 'Default',
      planId: 2,
      // FIXME: this will change user plan name.
      planName: 'Default',
      roomList: this.device.map.rooms.map(room => ({
        roomId: room.id.value,
        roomName: room.name,
        enable: Boolean(rooms.find(r => room.equals(r)))
      })),
      areaInfo: {
        mapHeadId: id.value,
        planId: 2,
        cleanAreaLength: restrictedZones.length,
        cleanAreaList: restrictedZones.map(zone => ({
          cleanAreaId: zone.id.value,
          type: 0,
          coordinateLength: zone.coordinates.length,
          coordinateList: zone.coordinates.map(({
            x,
            y
          }) => ({
            x,
            y
          }))
        }))
      }
    });
    await this.sendRecv('DEVICE_MAPID_SELECT_MAP_PLAN_REQ', 'DEVICE_MAPID_SELECT_MAP_PLAN_RSP', {
      mapHeadId: id.value,
      planId: 2,
      mode: 1
    });
    await this.sendRecv('DEVICE_MAPID_GET_GLOBAL_INFO_REQ', 'DEVICE_MAPID_GET_GLOBAL_INFO_RSP', {
      mask: 0x78ff
    });
    await this.sendRecv('DEVICE_AUTO_CLEAN_REQ', 'DEVICE_AUTO_CLEAN_RSP', {
      ctrlValue: CTRL_VALUE.START,
      cleanType: 2
    });
  }
  // Mota: modos de limpieza que la 3090 soporta y agnoc no exponía. Antes se pasa el robot
  // al modo correspondiente en reposo (0x1121: 4 espiral, 5 bordes, 7 fregado), como la app oficial.
  async setIdleMode(mode) {
    await this.sendRecv('DEVICE_MAPID_INTO_MODEIDLE_INFO_REQ', 'DEVICE_MAPID_INTO_MODEIDLE_INFO_RSP', {
      mode
    });
  }
  // Mota: limpieza normal aunque el último modo usado fuera bordes, espiral o fregado
  async startAutoClean() {
    if (getMotaCtrlOpcode(this.device.mode && this.device.mode.value)) {
      await this.setIdleMode(1);
    }
    await this.sendRecv('DEVICE_AUTO_CLEAN_REQ', 'DEVICE_AUTO_CLEAN_RSP', {
      ctrlValue: CTRL_VALUE.START,
      cleanType: 2
    });
  }
  async startEdgeClean() {
    await this.setIdleMode(5);
    await this.sendRecv('DEVICE_EDGE_CLEAN_REQ', 'DEVICE_EDGE_CLEAN_RSP', {
      ctrlValue: CTRL_VALUE.START
    });
  }
  async startSpiralClean() {
    await this.setIdleMode(4);
    await this.sendRecv('DEVICE_SPIRAL_CLEAN_REQ', 'DEVICE_SPIRAL_CLEAN_RSP', {
      ctrlValue: CTRL_VALUE.START
    });
  }
  async startMopClean() {
    await this.setIdleMode(7);
    await this.sendRecv('DEVICE_MOP_FLOOR_CLEAN_REQ', 'DEVICE_MOP_FLOOR_CLEAN_RSP', {
      ctrlValue: CTRL_VALUE.START
    });
  }
  async resetMap() {
    await this.sendRecv('DEVICE_MAPID_SET_HISTORY_MAP_ENABLE_REQ', 'DEVICE_MAPID_SET_HISTORY_MAP_ENABLE_RSP', {});
  }
  async controlLock() {
    await this.sendRecv('DEVICE_CONTROL_LOCK_REQ', 'DEVICE_CONTROL_LOCK_RSP', {});
  }
  async handshake() {
    await this.controlLock();
    this.send('DEVICE_STATUS_GETTING_REQ', {});
    void this.send('DEVICE_GET_ALL_GLOBAL_MAP_INFO_REQ', {
      unk1: 0,
      unk2: ''
    });
    void this.getTime();
    void this.updateMap();
    void this.getWlan();
  }
  handleDeviceVersionInfoUpdate(message) {
    const object = message.packet.payload.object;
    this.device.updateVersion(new _deviceVersion.DeviceVersion({
      software: object.softwareVersion,
      hardware: object.hardwareVersion
    }));
    this.emit('updateDevice');
    message.respond('DEVICE_VERSION_INFO_UPDATE_RSP', {
      result: 0
    });
  }
  handleDeviceAgentSetting(message) {
    const object = message.packet.payload.object;
    const props = {
      voice: _deviceVoice.DeviceVoiceMapper.toDomain({
        isEnabled: object.voice.voiceMode || false,
        volume: object.voice.volume || 1
      }),
      quietHours: new _deviceQuietHours.DeviceQuietHours({
        isEnabled: object.quietHours.isOpen,
        begin: _deviceTime.DeviceTime.fromMinutes(object.quietHours.beginTime),
        end: _deviceTime.DeviceTime.fromMinutes(object.quietHours.endTime)
      }),
      isEcoModeEnabled: object.cleanPreference.ecoMode || false,
      isRepeatCleanEnabled: object.cleanPreference.repeatClean || false,
      isBrokenCleanEnabled: object.cleanPreference.cleanBroken || false,
      isCarpetModeEnabled: object.cleanPreference.carpetTurbo || false,
      isHistoryMapEnabled: object.cleanPreference.historyMap || false
    };
    this.device.updateConfig(new _deviceConfig.DeviceConfig(props));
    message.respond('PUSH_DEVICE_AGENT_SETTING_RSP', {
      result: 0
    });
  }
  handleClientHeartbeat(message) {
    message.respond('CLIENT_HEARTBEAT_RSP', {});
  }
  handleDevicePackageUpgrade(message) {
    message.respond('PUSH_DEVICE_PACKAGE_UPGRADE_INFO_RSP', {
      result: 0
    });
  }
  handleDeviceStatus(message) {
    const object = message.packet.payload.object;
    const {
      battery,
      type,
      workMode,
      chargeStatus,
      cleanPreference,
      faultCode,
      waterLevel,
      mopType
    } = object;
    this.device.updateCurrentClean(new _deviceCurrentClean.DeviceCurrentClean({
      size: object.cleanSize,
      time: object.cleanTime
    }));
    this.device.updateState(_deviceState.DeviceStateMapper.toDomain({
      type,
      workMode,
      chargeStatus
    }));
    this.device.updateMode(_deviceMode.DeviceModeMapper.toDomain(workMode));
    // Mota: se conserva el código original (los 2xxx son eventos del firmware, no errores)
    this.device.motaRawFaultCode = faultCode;
    this.device.updateError(_deviceError.DeviceErrorMapper.toDomain(faultCode));
    this.device.updateBattery(_deviceBattery.DeviceBatteryMapper.toDomain(battery));
    this.device.updateFanSpeed(_deviceFanSpeed.DeviceFanSpeedMapper.toDomain(cleanPreference));
    if ((0, _isPresent.isPresent)(mopType)) {
      this.device.updateHasMopAttached(mopType);
    }
    if ((0, _isPresent.isPresent)(waterLevel)) {
      this.device.updateWaterLevel(_deviceWaterLevel.DeviceWaterLevelMapper.toDomain(waterLevel));
    }
    this.emit('updateDevice');
  }
  handleMapUpdate(message) {
    const object = message.packet.payload.object;
    const {
      statusInfo,
      mapHeadInfo,
      mapGrid,
      historyHeadInfo,
      robotPoseInfo,
      robotChargeInfo,
      cleanRoomList,
      roomSegmentList,
      wallListInfo,
      spotInfo,
      cleanPlanList,
      currentPlanId
    } = object;
    if (statusInfo) {
      const {
        batteryPercent: battery,
        faultType: type,
        workingMode: workMode,
        chargeState: chargeStatus,
        cleanPreference,
        faultCode
      } = statusInfo;
      this.device.updateCurrentClean(new _deviceCurrentClean.DeviceCurrentClean({
        size: statusInfo.cleanSize,
        time: statusInfo.cleanTime
      }));
      this.device.updateBattery(_deviceBattery.DeviceBatteryMapper.toDomain(battery));
      this.device.updateMode(_deviceMode.DeviceModeMapper.toDomain(workMode));
      this.device.updateState(_deviceState.DeviceStateMapper.toDomain({
        type,
        workMode,
        chargeStatus
      }));
      // Mota: se conserva el código original (los 2xxx son eventos del firmware, no errores)
      this.device.motaRawFaultCode = faultCode;
      this.device.updateError(_deviceError.DeviceErrorMapper.toDomain(faultCode));
      this.device.updateFanSpeed(_deviceFanSpeed.DeviceFanSpeedMapper.toDomain(cleanPreference));
      this.emit('updateDevice');
    }
    let map = this.device.map;
    if (mapHeadInfo && mapGrid) {
      const props = {
        id: new _id.ID(mapHeadInfo.mapHeadId),
        size: new _pixel.Pixel({
          x: mapHeadInfo.sizeX,
          y: mapHeadInfo.sizeY
        }),
        min: new _coordinate.Coordinate({
          x: mapHeadInfo.minX,
          y: mapHeadInfo.minY
        }),
        max: new _coordinate.Coordinate({
          x: mapHeadInfo.maxX,
          y: mapHeadInfo.maxY
        }),
        resolution: mapHeadInfo.resolution,
        grid: mapGrid,
        rooms: [],
        restrictedZones: [],
        robotPath: []
      };
      map = map ? map.clone(props) : new _deviceMap.DeviceMap(props);
      this.device.updateMap(map);
    }
    if (map) {
      if (historyHeadInfo) {
        const currentIndex = map.robotPath.length;
        map.updateRobotPath(map.robotPath.concat(historyHeadInfo.pointList.slice(currentIndex).map(({
          x,
          y
        }) => new _coordinate.Coordinate({
          x,
          y
        }))));
      }
      if (robotPoseInfo) {
        map.updateRobot(new _position.Position({
          x: robotPoseInfo.poseX,
          y: robotPoseInfo.poseY,
          phi: robotPoseInfo.posePhi
        }));
      }
      if (robotChargeInfo) {
        map.updateCharger(new _position.Position({
          x: robotChargeInfo.poseX,
          y: robotChargeInfo.poseY,
          phi: robotChargeInfo.posePhi
        }));
      }
      if (spotInfo) {
        map.updateCurrentSpot(new _position.Position({
          x: spotInfo.poseX,
          y: spotInfo.poseY,
          phi: spotInfo.posePhi
        }));
      }
      if (wallListInfo) {
        map.updateRestrictedZones(wallListInfo.cleanAreaList.map(cleanArea => {
          return new _zone.Zone({
            id: new _id.ID(cleanArea.cleanAreaId),
            coordinates: cleanArea.coordinateList.map(({
              x,
              y
            }) => {
              return new _coordinate.Coordinate({
                x,
                y
              });
            })
          });
        }));
      }
      if (cleanRoomList && roomSegmentList && cleanPlanList) {
        const currentPlan = cleanPlanList.find(plan => plan.planId === currentPlanId);
        map.updateRooms(cleanRoomList.map(cleanRoom => {
          const segment = roomSegmentList.find(roomSegment => roomSegment.roomId === cleanRoom.roomId);
          const roomInfo = currentPlan === null || currentPlan === void 0 ? void 0 : currentPlan.cleanRoomInfoList.find(r => r.roomId === cleanRoom.roomId);
          if (!segment) {
            return undefined;
          }
          return new _room.Room({
            id: new _id.ID(cleanRoom.roomId),
            name: cleanRoom.roomName,
            isEnabled: Boolean(roomInfo === null || roomInfo === void 0 ? void 0 : roomInfo.enable),
            center: new _coordinate.Coordinate({
              x: cleanRoom.roomX,
              y: cleanRoom.roomY
            }),
            pixels: segment === null || segment === void 0 ? void 0 : segment.roomPixelList.map(pixel => {
              return new _pixel.Pixel({
                x: pixel.x,
                y: pixel.y
              });
            })
          });
        }).filter(_isPresent.isPresent));
      }
    }
    this.emit('updateMap');
  }
  handleUpdateRobotPosition(message) {
    if (!this.device.map) {
      return;
    }
    const object = message.packet.payload.object;
    if (object.update) {
      this.device.map.updateRobot(new _position.Position({
        x: object.poseX,
        y: object.poseY,
        phi: object.posePhi
      }));
      this.emit('updateRobotPosition');
    }
  }
  handleUpdateChargePosition(message) {
    if (!this.device.map) {
      return;
    }
    const object = message.packet.payload.object;
    this.device.map.updateCharger(new _position.Position({
      x: object.poseX,
      y: object.poseY,
      phi: object.posePhi
    }));
    this.emit('updateChargerPosition');
  }
  handleDeviceBatteryInfo(message) {
    message.respond('PUSH_DEVICE_BATTERY_INFO_RSP', {
      result: 0
    });
    const object = message.packet.payload.object;
    this.device.updateBattery(_deviceBattery.DeviceBatteryMapper.toDomain(object.battery.level));
    this.emit('updateDevice');
  }
  handleWaitingMap() {
    this.device.updateHasWaitingMap(true);
    this.emit('updateDevice');
  }
  handleWorkstatusReport(message) {
    message.respond('DEVICE_WORKSTATUS_REPORT_RSP', {
      result: 0
    });
  }
  handleReportCleantask(message) {
    // Mota: se guarda el resumen de la limpieza hasta que llegue su mapa (0x1196)
    const object = message.packet.payload.object;
    this.motaCleanTasks = this.motaCleanTasks || new Map();
    this.motaCleanTasks.set(object.cleanId, object);
    message.respond('UNK_11A4', {
      unk1: 0
    });
  }
  handleReportCleanmap(message) {
    const object = message.packet.payload.object;
    // Mota: informe de limpieza completo (resumen + PNG del mapa) para el historial
    const task = this.motaCleanTasks && this.motaCleanTasks.get(object.cleanId);
    if (this.motaCleanTasks) {
      this.motaCleanTasks.delete(object.cleanId);
    }
    this.emit('cleanReport', {
      cleanId: object.cleanId,
      task,
      mapdata: object.mapdata
    });
    message.respond('DEVICE_EVENT_REPORT_RSP', {
      result: 0,
      body: {
        cleanId: object.cleanId
      }
    });
  }
  handleBinDataReport(message) {
    const object = message.packet.payload.object;
    message.respond('DEVICE_CLEANMAP_BINDATA_REPORT_RSP', {
      result: 0,
      cleanId: object.cleanId
    });
  }
  handleEventReport(message) {
    message.respond('UNK_11A7', {
      unk1: 0
    });
  }
  handleSetTime(message) {
    const date = new Date();
    message.respond('DEVICE_SETTIME_RSP', {
      deviceTime: Math.floor(date.getTime() / 1000),
      deviceTimezone: -1 * (date.getTimezoneOffset() * 60)
    });
  }
  addConnection(connection) {
    const added = this.multiplexer.addConnection(connection);
    if (added && this.multiplexer.connectionCount === 2) {
      void this.handshake();
    }
  }
  handleMessage(message) {
    const handler = this.handlers[message.opname];
    if (message.packet.userId.value !== 0 && message.packet.userId.value !== this.user.id.value) {
      message.respond('COMMON_ERROR_REPLY', {
        result: 11001,
        error: 'Target user is offline',
        opcode: message.packet.payload.opcode.value
      });
      return;
    }
    if (handler) {
      handler(message);
    } else {
      this.debug(`unhandled opcode ${message.opname}`);
    }
  }
  toString() {
    return [`device: ${this.device.toString()}`, `user: ${this.user.toString()}`].join(' ');
  }
  disconnect() {
    this.debug('disconnecting...');
    return this.multiplexer.close();
  }
  send(opname, object) {
    const ret = this.multiplexer.send({
      opname,
      userId: this.user.id,
      deviceId: this.device.id,
      object
    });
    if (!ret) {
      throw new _domain.DomainException(`There was an error sending opcode '${opname}'`);
    }
  }
  recv(opname) {
    return new Promise((resolve, reject) => {
      const done = packet => {
        clearTimeout(timer);
        resolve(packet);
      };
      const fail = () => {
        this.multiplexer.off(opname, done);
        reject(new _domain.DomainException(`Timeout waiting for response from opcode '${opname}'`));
      };
      const timer = setTimeout(fail, RECV_TIMEOUT);
      this.multiplexer.once(opname, done);
    });
  }
  sendRecv(sendOPName, recvOPName, sendObject) {
    this.send(sendOPName, sendObject);
    return this.recv(recvOPName);
  }
}, (_applyDecoratedDescriptor(_class.prototype, "handleDeviceVersionInfoUpdate", [_bind.bind], Object.getOwnPropertyDescriptor(_class.prototype, "handleDeviceVersionInfoUpdate"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "handleDeviceAgentSetting", [_bind.bind], Object.getOwnPropertyDescriptor(_class.prototype, "handleDeviceAgentSetting"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "handleClientHeartbeat", [_bind.bind], Object.getOwnPropertyDescriptor(_class.prototype, "handleClientHeartbeat"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "handleDevicePackageUpgrade", [_bind.bind], Object.getOwnPropertyDescriptor(_class.prototype, "handleDevicePackageUpgrade"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "handleDeviceStatus", [_bind.bind], Object.getOwnPropertyDescriptor(_class.prototype, "handleDeviceStatus"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "handleMapUpdate", [_bind.bind], Object.getOwnPropertyDescriptor(_class.prototype, "handleMapUpdate"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "handleUpdateRobotPosition", [_bind.bind], Object.getOwnPropertyDescriptor(_class.prototype, "handleUpdateRobotPosition"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "handleUpdateChargePosition", [_bind.bind], Object.getOwnPropertyDescriptor(_class.prototype, "handleUpdateChargePosition"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "handleDeviceBatteryInfo", [_bind.bind], Object.getOwnPropertyDescriptor(_class.prototype, "handleDeviceBatteryInfo"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "handleWaitingMap", [_bind.bind], Object.getOwnPropertyDescriptor(_class.prototype, "handleWaitingMap"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "handleWorkstatusReport", [_bind.bind], Object.getOwnPropertyDescriptor(_class.prototype, "handleWorkstatusReport"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "handleReportCleantask", [_bind.bind], Object.getOwnPropertyDescriptor(_class.prototype, "handleReportCleantask"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "handleReportCleanmap", [_bind.bind], Object.getOwnPropertyDescriptor(_class.prototype, "handleReportCleanmap"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "handleBinDataReport", [_bind.bind], Object.getOwnPropertyDescriptor(_class.prototype, "handleBinDataReport"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "handleEventReport", [_bind.bind], Object.getOwnPropertyDescriptor(_class.prototype, "handleEventReport"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "handleSetTime", [_bind.bind], Object.getOwnPropertyDescriptor(_class.prototype, "handleSetTime"), _class.prototype)), _class);
exports.Robot = Robot;
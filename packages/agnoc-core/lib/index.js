"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _opcodes = require("./constants/opcodes.constant");
Object.keys(_opcodes).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _opcodes[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _opcodes[key];
    }
  });
});
var _cloudServer = require("./emitters/cloud-server.emitter");
Object.keys(_cloudServer).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _cloudServer[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _cloudServer[key];
    }
  });
});
var _robot = require("./emitters/robot.emitter");
Object.keys(_robot).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _robot[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _robot[key];
    }
  });
});
var _deviceMap = require("./entities/device-map.entity");
Object.keys(_deviceMap).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _deviceMap[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _deviceMap[key];
    }
  });
});
var _device = require("./entities/device.entity");
Object.keys(_device).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _device[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _device[key];
    }
  });
});
var _room = require("./entities/room.entity");
Object.keys(_room).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _room[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _room[key];
    }
  });
});
var _coordinate = require("./value-objects/coordinate.value-object");
Object.keys(_coordinate).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _coordinate[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _coordinate[key];
    }
  });
});
var _deviceBattery = require("./value-objects/device-battery.value-object");
Object.keys(_deviceBattery).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _deviceBattery[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _deviceBattery[key];
    }
  });
});
var _deviceConsumable = require("./value-objects/device-consumable.value-object");
Object.keys(_deviceConsumable).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _deviceConsumable[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _deviceConsumable[key];
    }
  });
});
var _deviceCurrentClean = require("./value-objects/device-current-clean.value-object");
Object.keys(_deviceCurrentClean).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _deviceCurrentClean[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _deviceCurrentClean[key];
    }
  });
});
var _deviceFanSpeed = require("./value-objects/device-fan-speed.value-object");
Object.keys(_deviceFanSpeed).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _deviceFanSpeed[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _deviceFanSpeed[key];
    }
  });
});
var _deviceMode = require("./value-objects/device-mode.value-object");
Object.keys(_deviceMode).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _deviceMode[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _deviceMode[key];
    }
  });
});
var _deviceQuietHours = require("./value-objects/device-quiet-hours.value-object");
Object.keys(_deviceQuietHours).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _deviceQuietHours[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _deviceQuietHours[key];
    }
  });
});
var _deviceState = require("./value-objects/device-state.value-object");
Object.keys(_deviceState).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _deviceState[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _deviceState[key];
    }
  });
});
var _deviceSystem = require("./value-objects/device-system.value-object");
Object.keys(_deviceSystem).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _deviceSystem[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _deviceSystem[key];
    }
  });
});
var _deviceTime = require("./value-objects/device-time.value-object");
Object.keys(_deviceTime).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _deviceTime[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _deviceTime[key];
    }
  });
});
var _deviceVersion = require("./value-objects/device-version.value-object");
Object.keys(_deviceVersion).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _deviceVersion[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _deviceVersion[key];
    }
  });
});
var _deviceVoice = require("./value-objects/device-voice.value-object");
Object.keys(_deviceVoice).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _deviceVoice[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _deviceVoice[key];
    }
  });
});
var _deviceWaterLevel = require("./value-objects/device-water-level.value-object");
Object.keys(_deviceWaterLevel).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _deviceWaterLevel[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _deviceWaterLevel[key];
    }
  });
});
var _pixel = require("./value-objects/pixel.value-object");
Object.keys(_pixel).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _pixel[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _pixel[key];
    }
  });
});
var _position = require("./value-objects/position.value-object");
Object.keys(_position).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _position[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _position[key];
    }
  });
});
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MASK = void 0;
exports.decodeMap = decodeMap;
exports.readAreaInfoList = readAreaInfoList;
exports.readCleanPlanInfo = readCleanPlanInfo;
exports.readCleanPlanList = readCleanPlanList;
exports.readCleanRoomInfoList = readCleanRoomInfoList;
exports.readCleanRoomList = readCleanRoomList;
exports.readMapHeadInfo = readMapHeadInfo;
exports.readMapInfoList = readMapInfoList;
var _zlib = require("zlib");
var _domain = require("../exceptions/domain.exception");
var _stream = require("../utils/stream.util");
var _toStream = require("../utils/to-stream.util");
function readMapHeadInfo(stream) {
  return {
    mapHeadId: (0, _stream.readWord)(stream),
    mapValid: (0, _stream.readWord)(stream),
    mapType: (0, _stream.readWord)(stream),
    sizeX: (0, _stream.readWord)(stream),
    sizeY: (0, _stream.readWord)(stream),
    minX: (0, _stream.readFloat)(stream),
    minY: (0, _stream.readFloat)(stream),
    maxX: (0, _stream.readFloat)(stream),
    maxY: (0, _stream.readFloat)(stream),
    resolution: (0, _stream.readFloat)(stream)
  };
}
function readCleanPlanInfo(stream) {
  return {
    mapHeadId: (0, _stream.readWord)(stream),
    mask: (0, _stream.readShort)(stream),
    firstCleanFlag: (0, _stream.readByte)(stream)
  };
}
function readMapInfoList(stream) {
  const size = (0, _stream.readByte)(stream);
  const list = [];
  for (let i = 0; i < size; i++) {
    list.push({
      mapHeadId: (0, _stream.readWord)(stream),
      mapName: (0, _stream.readString)(stream)
    });
  }
  return list;
}
function readCleanRoomList(stream) {
  const size = (0, _stream.readWord)(stream);
  const list = [];
  for (let i = 0; i < size; i++) {
    list.push({
      roomId: (0, _stream.readByte)(stream),
      roomName: (0, _stream.readString)(stream),
      roomState: (0, _stream.readByte)(stream),
      roomX: (0, _stream.readFloat)(stream),
      roomY: (0, _stream.readFloat)(stream)
    });
  }
  return list;
}
function readAreaInfoList(stream) {
  const size = (0, _stream.readWord)(stream);
  const list = [];
  for (let i = 0; i < size; i++) {
    const areaInfo = {
      areaId: (0, _stream.readWord)(stream),
      areaType: (0, _stream.readWord)(stream),
      points: (0, _stream.readWord)(stream)
    };
    if (areaInfo.points) {
      areaInfo.x = new Array(areaInfo.points).fill(0).map(() => (0, _stream.readFloat)(stream));
      areaInfo.y = new Array(areaInfo.points).fill(0).map(() => (0, _stream.readFloat)(stream));
      areaInfo.unk1 = new Array(areaInfo.points).fill(0).map(() => (0, _stream.readFloat)(stream));
      areaInfo.unk2 = new Array(areaInfo.points).fill(0).map(() => (0, _stream.readFloat)(stream));
      areaInfo.unk3 = new Array(areaInfo.points).fill(0).map(() => (0, _stream.readFloat)(stream));
    }
    list.push(areaInfo);
  }
  return list;
}
function readCleanRoomInfoList(stream) {
  const size = (0, _stream.readWord)(stream);
  const list = [];
  for (let i = 0; i < size; i++) {
    list.push({
      roomId: (0, _stream.readByte)(stream),
      enable: (0, _stream.readByte)(stream)
    });
  }
  return list;
}
function readCleanPlanList(stream) {
  const size = (0, _stream.readByte)(stream);
  const list = [];
  for (let i = 0; i < size; i++) {
    list.push({
      planId: (0, _stream.readWord)(stream),
      planName: (0, _stream.readString)(stream),
      mapHeadId: (0, _stream.readWord)(stream),
      currentPlanId: (0, _stream.readWord)(stream),
      areaInfoList: readAreaInfoList(stream),
      cleanRoomInfoList: readCleanRoomInfoList(stream)
    });
  }
  return list;
}
function readCleanCoordinateList(stream) {
  const count = (0, _stream.readWord)(stream);
  const list = [];
  for (let i = 0; i < count; i++) {
    list.push({
      x: (0, _stream.readFloat)(stream),
      y: (0, _stream.readFloat)(stream)
    });
  }

  // dump unknown bytes.
  stream.read(3 * count * 4);
  return list;
}
function readCleanAreaList(stream) {
  const count = (0, _stream.readWord)(stream);
  const list = [];
  for (let i = 0; i < count; i++) {
    list.push({
      cleanAreaId: (0, _stream.readWord)(stream),
      cleanPlanId: (0, _stream.readWord)(stream),
      coordinateList: readCleanCoordinateList(stream)
    });
  }
  return list;
}
function readCleanAreaInfo(stream) {
  return {
    mapHeadId: (0, _stream.readWord)(stream),
    cleanPlanId: (0, _stream.readWord)(stream),
    cleanAreaList: readCleanAreaList(stream)
  };
}
function readRoomSegment(stream) {
  const list = [];
  const roomId = (0, _stream.readWord)(stream);
  const count = (0, _stream.readWord)(stream);
  for (let i = 0; i < count; i++) {
    list.push({
      x: (0, _stream.readShort)(stream),
      y: (0, _stream.readShort)(stream),
      mask: (0, _stream.readByte)(stream)
    });
  }
  return {
    roomId,
    roomPixelList: list
  };
}
function readRoomSegmentList(stream) {
  const count = (0, _stream.readWord)(stream);
  const list = [];
  for (let i = 0; i < count; i++) {
    list.push(readRoomSegment(stream));
  }
  return list;
}
function readRoomConnectionList(stream, roomList) {
  const list = [];
  for (let i = 0; i < roomList.length; i++) {
    const connectionList = [];
    for (let j = 0; j < roomList.length; j++) {
      const flag = (0, _stream.readByte)(stream);
      if (flag) {
        connectionList.push(roomList[j].roomId);
      }
    }
    list.push({
      roomId: roomList[i].roomId,
      connectionList
    });
  }
  return list;
}
function readPointList(stream, pointNumber) {
  const list = [];
  for (let i = 0; i < pointNumber; i++) {
    list.push({
      flag: (0, _stream.readByte)(stream),
      x: (0, _stream.readFloat)(stream),
      y: (0, _stream.readFloat)(stream)
    });
  }
  return list;
}
const MASK = {
  STATUS: 0x1,
  MAP: 0x2,
  HISTORY: 0x4,
  CHARGER: 0x8,
  WALL_LIST: 0x10,
  AREA_LIST: 0x20,
  SPOT: 0x40,
  ROBOT: 0x80,
  AREA_MODE: 0x100,
  SPOT_MODE: 0x200,
  PLAN_LIST: 0x800,
  UNK: 0x1000,
  UNK_2: 0x2000,
  ROOM_LIST: 0x4000
};
exports.MASK = MASK;
function readMap(stream, mask) {
  const data = {
    mask
  };
  if (data.mask > 0x7fff) {
    throw new _domain.DomainException(`Invalid mask ${data.mask}`);
  }
  if (data.mask & 0x1) {
    data.statusInfo = {
      mapHeadId: (0, _stream.readWord)(stream),
      hasHistoryMap: Boolean((0, _stream.readWord)(stream)),
      workingMode: (0, _stream.readWord)(stream),
      batteryPercent: (0, _stream.readWord)(stream),
      chargeState: Boolean((0, _stream.readWord)(stream)),
      faultType: (0, _stream.readWord)(stream),
      faultCode: (0, _stream.readWord)(stream),
      cleanPreference: (0, _stream.readWord)(stream),
      repeatClean: Boolean((0, _stream.readWord)(stream)),
      cleanTime: (0, _stream.readWord)(stream),
      cleanSize: (0, _stream.readWord)(stream)
    };
  }
  if (data.mask & 0x2) {
    data.mapHeadInfo = readMapHeadInfo(stream);
    data.mapGrid = stream.read(data.mapHeadInfo.sizeX * data.mapHeadInfo.sizeY);
  }
  if (data.mask & 0x4) {
    data.historyHeadInfo = {
      mapHeadId: (0, _stream.readWord)(stream),
      poseId: (0, _stream.readWord)(stream),
      pointNumber: (0, _stream.readWord)(stream),
      pointList: []
    };
    data.historyHeadInfo.pointList = readPointList(stream, data.historyHeadInfo.pointNumber);
  }
  if (data.mask & 0x8) {
    data.robotChargeInfo = {
      mapHeadId: (0, _stream.readWord)(stream),
      poseX: (0, _stream.readFloat)(stream),
      poseY: (0, _stream.readFloat)(stream),
      posePhi: (0, _stream.readFloat)(stream)
    };
  }
  if (data.mask & 0x10) {
    data.wallListInfo = readCleanAreaInfo(stream);
  }
  if (data.mask & 0x20) {
    data.areaListInfo = readCleanAreaInfo(stream);
  }
  if (data.mask & 0x40) {
    data.spotInfo = {
      mapHeadId: (0, _stream.readWord)(stream),
      ctrlValue: (0, _stream.readWord)(stream),
      poseX: (0, _stream.readFloat)(stream),
      poseY: (0, _stream.readFloat)(stream),
      posePhi: (0, _stream.readFloat)(stream)
    };
  }
  if (data.mask & 0x80) {
    data.robotPoseInfo = {
      mapHeadId: (0, _stream.readWord)(stream),
      poseId: (0, _stream.readWord)(stream),
      update: (0, _stream.readByte)(stream),
      poseX: (0, _stream.readFloat)(stream),
      poseY: (0, _stream.readFloat)(stream),
      posePhi: (0, _stream.readFloat)(stream)
    };
  }

  // if (data.mask & 0x100) {
  //   throw new DomainException(
  //     `handleMap: unhandled mask 0x100 (${data.mask}) with payload ${
  //       (stream.read() as Buffer | null)?.length || 0
  //     }`
  //   );
  // }

  // if (data.mask & 0x200) {
  //   throw new DomainException(
  //     `handleMap: unhandled mask 0x200 (${data.mask}) with payload ${
  //       (stream.read() as Buffer | null)?.length || 0
  //     }`
  //   );
  // }

  // if (data.mask & 0x400) {
  //   throw new DomainException(
  //     `handleMap: unhandled mask 0x400 (${data.mask}) with payload ${
  //       (stream.read() as Buffer | null)?.length || 0
  //     }`
  //   );
  // }

  if (data.mask & 0x800) {
    data.cleanPlanInfo = readCleanPlanInfo(stream);
    data.mapInfoList = readMapInfoList(stream);
    data.currentPlanId = (0, _stream.readWord)(stream);
    data.cleanRoomList = readCleanRoomList(stream);
    data.cleanPlanList = readCleanPlanList(stream);
  }
  if (data.mask & 0x1000 && data.cleanRoomList) {
    // dump rooms
    data.roomConnectionList = readRoomConnectionList(stream, data.cleanRoomList);
  }
  if (data.mask & 0x2000) {
    data.roomEnableInfo = {
      mapHeadId: (0, _stream.readWord)(stream),
      size: (0, _stream.readByte)(stream)
    };
    if (data.roomEnableInfo.size) {
      // throw new DomainException("handleMap: unhandled room enable info");
    }

    // dump unknown bytes
    data.unk1 = stream.read(50);
  }
  if (data.mask & 0x4000) {
    data.roomSegmentList = readRoomSegmentList(stream);
  }
  if (stream.readableLength) {
    throw new _domain.DomainException('handleMap: unread bytes on stream');
  }
  return data;
}
function decodeMap(payload) {
  const buffer = (0, _zlib.inflateSync)(payload);
  try {
    // try 3490 approach.
    const stream = (0, _toStream.toStream)(buffer);
    const mask = (0, _stream.readWord)(stream);
    return readMap(stream, mask);
  } catch (e) {
    // on error, try 3090 approach.
    const stream = (0, _toStream.toStream)(buffer);
    const mask = (0, _stream.readShort)(stream);
    return readMap(stream, mask);
  }
}
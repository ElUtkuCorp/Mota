"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.decodeArea = decodeArea;
var _zlib = require("zlib");
var _stream = require("../utils/stream.util");
var _toStream = require("../utils/to-stream.util");
var _map = require("./map.decoder");
function decodeArea(payload) {
  const buffer = (0, _zlib.inflateSync)(payload);
  const stream = (0, _toStream.toStream)(buffer);
  const data = {};
  data.count = (0, _stream.readWord)(stream);
  if (!data.count) {
    return data;
  }
  data.mapHeadId = (0, _stream.readWord)(stream);
  data.unk2 = [];
  for (let i = 0; i < data.count; i++) {
    data.unk2.push({
      unk1: (0, _stream.readWord)(stream),
      unk2: (0, _stream.readWord)(stream)
    });
  }
  data.mapHeadInfo = (0, _map.readMapHeadInfo)(stream);
  data.mapGrid = stream.read(data.mapHeadInfo.sizeX * data.mapHeadInfo.sizeY);
  data.cleanPlanInfo = (0, _map.readCleanPlanInfo)(stream);
  data.mapInfoList = (0, _map.readMapInfoList)(stream);
  data.currentPlanId = (0, _stream.readWord)(stream);
  data.cleanRoomList = (0, _map.readCleanRoomList)(stream);
  data.cleanPlanList = (0, _map.readCleanPlanList)(stream);
  return data;
}
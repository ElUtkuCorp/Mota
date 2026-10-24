const cecotec = require("./cecotec");
const dreame = require("./dreame");
const midea = require("./midea");
const mock = require("./mock");
const roborock = require("./roborock");
const viomi = require("./viomi");

module.exports = Object.assign({},
    roborock,
    cecotec,
    viomi,
    dreame,
    midea,
    mock
);

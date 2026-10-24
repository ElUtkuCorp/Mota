const ValetudoEvent = require("./ValetudoEvent");

/**
 * Mota: el mapa del robot ha cambiado más de lo permitido respecto al de referencia
 */
class MotaMapChangedValetudoEvent extends ValetudoEvent {
    /**
     * @param {object} options
     * @param {object} [options.metaData]
     * @class
     */
    constructor(options) {
        super(Object.assign({}, options, {id: "mota_map_changed"}));
    }
}

module.exports = MotaMapChangedValetudoEvent;

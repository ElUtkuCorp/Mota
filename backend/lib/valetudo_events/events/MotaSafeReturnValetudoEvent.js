const DismissibleValetudoEvent = require("./DismissibleValetudoEvent");

/**
 * Mota: la vuelta segura desde pausa no ha visto la relocalización y no ha mandado el robot a la base
 */
class MotaSafeReturnValetudoEvent extends DismissibleValetudoEvent {
    /**
     *
     * @param {object}   options
     * @param {string}  [options.id]
     * @param {Date}    [options.timestamp]
     * @param {boolean} [options.processed]
     * @param {object}  [options.metaData]
     * @class
     */
    constructor(options) {
        super(Object.assign({}, options, {id: "mota_safe_return"}));
    }
}

module.exports = MotaSafeReturnValetudoEvent;

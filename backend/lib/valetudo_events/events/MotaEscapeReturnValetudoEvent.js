const DismissibleValetudoEvent = require("./DismissibleValetudoEvent");

/**
 * Mota: el robot se ha atascado (514). metaData: {sent, reason?, battery}
 */
class MotaEscapeReturnValetudoEvent extends DismissibleValetudoEvent {
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
        super(Object.assign({}, options, {id: "mota_escape_return"}));
    }
}

module.exports = MotaEscapeReturnValetudoEvent;

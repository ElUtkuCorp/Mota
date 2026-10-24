const OperationModeControlCapability = require("../../../core/capabilities/OperationModeControlCapability");
const {PresetSelectionStateAttribute} = require("../../../entities/state/attributes");

/**
 * Mota: modo de la próxima limpieza. La 3090 no tiene un "modo" persistente que se pueda elegir
 * antes de empezar: cada modo es una orden de arranque distinta (normal, fregado, bordes, espiral).
 * Aquí se guarda la elección y CecotecBasicControlCapability.start() lanza la orden correspondiente.
 *
 * @extends OperationModeControlCapability<import("../CecotecCongaRobot")>
 */
class CecotecOperationModeControlCapability extends OperationModeControlCapability {
    /**
     * @param {string} preset
     * @returns {Promise<void>}
     */
    async selectPreset(preset) {
        const matchedPreset = this.presets.find(p => {
            return p.name === preset;
        });

        if (!matchedPreset) {
            throw new Error("Invalid Preset");
        }

        this.robot.selectedOperationMode = matchedPreset.value;
        this.robot.state.upsertFirstMatchingAttribute(new PresetSelectionStateAttribute({
            type: PresetSelectionStateAttribute.TYPE.OPERATION_MODE,
            value: matchedPreset.value
        }));
        this.robot.emitStateAttributesUpdated();
    }
}

module.exports = CecotecOperationModeControlCapability;

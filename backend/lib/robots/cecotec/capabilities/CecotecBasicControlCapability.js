const BasicControlCapability = require("../../../core/capabilities/BasicControlCapability");
const {PresetSelectionStateAttribute, StatusStateAttribute} = require("../../../entities/state/attributes");

/**
 * @extends BasicControlCapability<import("../CecotecCongaRobot")>
 */
module.exports = class CecotecBasicControlCapability extends BasicControlCapability {
    async start() {
        if (!this.robot.robot) {
            throw new Error("There is no robot connected to server");
        }

        // Mota: en pausa se reanuda lo que estuviera haciendo; si no, se arranca el modo elegido
        const status = this.robot.state.getFirstMatchingAttributeByConstructor(StatusStateAttribute);
        if (status?.value === StatusStateAttribute.VALUE.PAUSED) {
            await this.robot.robot.start();

            return;
        }

        // Mota: para poder reanudar tras cargar
        this.robot.lastCleaningRequest = {type: "mode", mode: this.robot.selectedOperationMode};

        switch (this.robot.selectedOperationMode) {
            case PresetSelectionStateAttribute.MODE.MOP:
                await this.robot.robot.startMopClean();
                break;
            case PresetSelectionStateAttribute.MODE.EDGE:
                await this.robot.robot.startEdgeClean();
                break;
            case PresetSelectionStateAttribute.MODE.SPIRAL:
                await this.robot.robot.startSpiralClean();
                break;
            default:
                await this.robot.robot.startAutoClean();
        }
    }

    async stop() {
        if (!this.robot.robot) {
            throw new Error("There is no robot connected to server");
        }

        await this.robot.robot.stop();
    }

    async pause() {
        if (!this.robot.robot) {
            throw new Error("There is no robot connected to server");
        }

        await this.robot.robot.pause();
    }

    async home() {
        if (!this.robot.robot) {
            throw new Error("There is no robot connected to server");
        }

        await this.robot.robot.home();
    }
};

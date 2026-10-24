const TotalStatisticsCapability = require("../../../core/capabilities/TotalStatisticsCapability");
const ValetudoDataPoint = require("../../../entities/core/ValetudoDataPoint");

/**
 * Mota: estadísticas totales calculadas a partir del historial de limpiezas que guarda Mota
 * (el firmware no las ofrece).
 *
 * @extends TotalStatisticsCapability<import("../CecotecCongaRobot")>
 */
class CecotecTotalStatisticsCapability extends TotalStatisticsCapability {
    /**
     * @returns {Promise<Array<ValetudoDataPoint>>}
     */
    async getStatistics() {
        const totals = this.robot.cleanHistory?.getTotals() ?? {count: 0, timeSeconds: 0, areaCm2: 0};

        return [
            new ValetudoDataPoint({type: ValetudoDataPoint.TYPES.COUNT, value: totals.count}),
            new ValetudoDataPoint({type: ValetudoDataPoint.TYPES.TIME, value: totals.timeSeconds}),
            new ValetudoDataPoint({type: ValetudoDataPoint.TYPES.AREA, value: totals.areaCm2}),
        ];
    }

    getProperties() {
        return {
            availableStatistics: [
                ValetudoDataPoint.TYPES.COUNT,
                ValetudoDataPoint.TYPES.TIME,
                ValetudoDataPoint.TYPES.AREA
            ]
        };
    }
}

module.exports = CecotecTotalStatisticsCapability;

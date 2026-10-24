const ConsumableMonitoringCapability = require("../../../core/capabilities/ConsumableMonitoringCapability");
const ValetudoConsumable = require("../../../entities/core/ValetudoConsumable");
const {CONSUMABLE_TYPE} = require("@agnoc/core");

const { TYPE, SUB_TYPE, UNITS } = ValetudoConsumable;
const MAIN_BRUSH_LIFE_TIME = 320 * 60;
const SIDE_BRUSH_LIFE_TIME = 220 * 60;
const FILTER_LIFE_TIME = 160 * 60;
const DISHCLOTH_LIFE_TIME = 100 * 60;

const CONSUMABLE_MAPPING = {
    [CONSUMABLE_TYPE.MAIN_BRUSH]: { type: TYPE.BRUSH, subType: SUB_TYPE.MAIN, lifeTime: MAIN_BRUSH_LIFE_TIME },
    [CONSUMABLE_TYPE.SIDE_BRUSH]: { type: TYPE.BRUSH, subType: SUB_TYPE.SIDE_RIGHT, lifeTime: SIDE_BRUSH_LIFE_TIME },
    [CONSUMABLE_TYPE.FILTER]: { type: TYPE.FILTER, subType: SUB_TYPE.MAIN, lifeTime: FILTER_LIFE_TIME },
    [CONSUMABLE_TYPE.DISHCLOTH]: { type: TYPE.MOP, subType: SUB_TYPE.MAIN, lifeTime: DISHCLOTH_LIFE_TIME },
};

/**
 * @extends ConsumableMonitoringCapability<import("../CecotecCongaRobot")>
 */
module.exports = class CecotecConsumableMonitoringCapability extends ConsumableMonitoringCapability {
    /**
     * @returns {Promise<Array<ValetudoConsumable>>}
     */
    async getConsumables() {
        if (!this.robot.robot) {
            return [];
        }

        const list = await this.robot.robot.getConsumables();
        const consumables = list.map(({ type, used }) => {
            const mapping = CONSUMABLE_MAPPING[type];

            if (!mapping) {
                return null;
            }

            return new ValetudoConsumable({
                type: mapping.type,
                subType: mapping.subType,
                remaining: {
                    unit: UNITS.MINUTES,
                    value: Math.max(mapping.lifeTime - used, 0)
                }
            });
        }).filter(Boolean);

        this.raiseEventIfRequired(consumables);

        return consumables;
    }

    /**
     * @param {string} type
     * @param {string} [subType]
     * @returns {Promise<void>}
     */
    async resetConsumable(type, subType) {
        if (!this.robot.robot) {
            throw new Error("There is no robot connected to server");
        }

        const consumable = Object.keys(CONSUMABLE_MAPPING).find(key => {
            const mapping = CONSUMABLE_MAPPING[key];

            return mapping.type === type && (mapping.subType === subType || type === TYPE.FILTER || type === TYPE.MOP);
        });

        if (consumable) {
            await this.robot.robot.resetConsumable(/** @type {import("@agnoc/core").ConsumableType} */ (consumable));
            this.markEventsAsProcessed(type, subType);
        }
    }

    getProperties() {
        return {
            availableConsumables: Object.values(CONSUMABLE_MAPPING).map(mapping => {
                return {
                    type: mapping.type,
                    subType: mapping.subType,
                    unit: UNITS.MINUTES,
                    maxValue: mapping.lifeTime
                };
            })
        };
    }
};

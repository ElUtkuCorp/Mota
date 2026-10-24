const CecotecCleanPreference = require("../CecotecCleanPreference");
const CleanRouteControlCapability = require("../../../core/capabilities/CleanRouteControlCapability");

/**
 * Mota: la "limpieza x2" del firmware (repeatClean) expuesta como ruta de limpieza:
 * normal = una pasada, intensive = dos pasadas. Es una preferencia persistente del robot y se
 * aplica a cualquier modo (todo, zonas, habitaciones) y también al fregado.
 *
 * @extends CleanRouteControlCapability<import("../CecotecCongaRobot")>
 */
class CecotecCleanRouteControlCapability extends CleanRouteControlCapability {
    /**
     * @returns {Promise<import("../../../core/capabilities/CleanRouteControlCapability").CleanRouteControlCapabilityRoute>}
     */
    async getRoute() {
        if (!this.robot.robot) {
            throw new Error("There is no robot connected to server");
        }

        return CecotecCleanPreference.GET(this.robot.robot, "repeatClean") ?
            CleanRouteControlCapability.ROUTE.INTENSIVE :
            CleanRouteControlCapability.ROUTE.NORMAL;
    }

    /**
     * @param {import("../../../core/capabilities/CleanRouteControlCapability").CleanRouteControlCapabilityRoute} newRoute
     * @returns {Promise<void>}
     */
    async setRoute(newRoute) {
        if (!this.robot.robot) {
            throw new Error("There is no robot connected to server");
        }

        switch (newRoute) {
            case CleanRouteControlCapability.ROUTE.NORMAL:
                return CecotecCleanPreference.SET(this.robot.robot, "repeatClean", false);
            case CleanRouteControlCapability.ROUTE.INTENSIVE:
                return CecotecCleanPreference.SET(this.robot.robot, "repeatClean", true);
            default:
                throw new Error(`Received invalid route ${newRoute}`);
        }
    }

    getProperties() {
        return {
            supportedRoutes: [
                CleanRouteControlCapability.ROUTE.NORMAL,
                CleanRouteControlCapability.ROUTE.INTENSIVE
            ],
            mopOnly: [],
            oneTime: []
        };
    }
}

module.exports = CecotecCleanRouteControlCapability;

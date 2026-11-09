const Logger = require("../../Logger");
const {getFirmwareUtcOffsetMinutes} = require("./CecotecFirmwareTime");

const MINUTES_PER_DAY = 1440;

/**
 * Mota: programaciones guardadas en el firmware (booking_list_config.ini), las que creaba la app oficial. Son
 * independientes de la programación de Mota y pueden lanzar una limpieza sin que Mota lo sepa. Solo se ven y se
 * borran.
 *
 * Se piden por protocolo sin pasar por DeviceOrder de agnoc: lanza una excepción con cualquier entrada sin cleanInfo
 * y confunde "repetir" con "activa".
 *
 * Días: bit 0 = domingo … bit 6 = sábado [H], como WeekDay en agnoc. Horas en la del firmware (UTC + sync_time_diff).
 */
class CecotecFirmwareOrders {
    /**
     * @param {object} options
     * @param {import("./CecotecCongaRobot")} options.robot
     * @param {() => number} [options.getOffsetMinutes] minutos que la hora del firmware va por delante de UTC
     */
    constructor(options) {
        this.robot = options.robot;
        this.getOffsetMinutes = options.getOffsetMinutes ?? (() => {
            return getFirmwareUtcOffsetMinutes();
        });
        /** @type {Promise<any>} las órdenes se mandan de una en una */
        this.queue = Promise.resolve();
    }

    /**
     * @returns {Promise<Array<object>>}
     */
    list() {
        return this.serialize(() => {
            return this.fetch();
        });
    }

    /**
     * Borra una programación y vuelve a leer la lista
     *
     * @param {number} id
     * @returns {Promise<{removed: boolean, orders: Array<object>}>}
     */
    delete(id) {
        return this.serialize(async () => {
            const before = await this.fetch();

            if (!before.some(order => {
                return order.id === id;
            })) {
                throw Object.assign(new Error(`No existe la programación ${id}`), {status: 404});
            }

            Logger.info(`Firmware orders: deleting order ${id}`);
            await this.agnoc().sendRecv("DEVICE_ORDERLIST_DELETE_REQ", "DEVICE_ORDERLIST_DELETE_RSP", {
                orderId: id,
                mode: 1
            });

            const orders = await this.fetch();
            const removed = !orders.some(order => {
                return order.id === id;
            });

            if (!removed) {
                Logger.warn(`Firmware orders: order ${id} is still listed after deleting it`);
            }

            return {removed: removed, orders: orders};
        });
    }

    /**
     * @private
     * @returns {any}
     */
    agnoc() {
        const agnoc = this.robot.robot;

        if (!agnoc) {
            throw new Error("There is no robot connected to server");
        }

        return agnoc;
    }

    /**
     * @private
     * @template T
     * @param {() => Promise<T>} fn
     * @returns {Promise<T>}
     */
    serialize(fn) {
        const result = this.queue.then(fn);

        this.queue = result.catch(() => {
            /* el error lo recibe quien hizo la petición */
        });

        return result;
    }

    /**
     * @private
     * @returns {Promise<Array<object>>}
     */
    async fetch() {
        const packet = await this.agnoc().sendRecv("DEVICE_ORDERLIST_GETTING_REQ", "DEVICE_ORDERLIST_GETTING_RSP", {});
        const orderList = packet?.payload?.object?.orderList;

        if (!Array.isArray(orderList)) {
            return [];
        }

        const offset = this.getOffsetMinutes();

        return orderList
            .filter(order => {
                return order && Number.isInteger(order.orderId) && Number.isInteger(order.dayTime);
            })
            .map(order => {
                return CecotecFirmwareOrders.TO_ORDER(order, offset);
            });
    }

    /**
     * @param {any} order entrada de orderList
     * @param {number} offsetMinutes minutos que la hora del firmware va por delante de UTC
     * @returns {object}
     */
    static TO_ORDER(order, offsetMinutes) {
        const firmwareMinutes = ((order.dayTime % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
        const utcTotal = firmwareMinutes - offsetMinutes;
        // Pasar a UTC puede cambiar de día
        const dayShift = Math.floor(utcTotal / MINUTES_PER_DAY);
        const utcMinutes = ((utcTotal % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
        const weekDay = Number.isInteger(order.weekDay) ? order.weekDay & 0x7f : 0;
        const days = [];

        for (let day = 0; day < 7; day++) {
            if (weekDay & (1 << day)) {
                days.push(day);
            }
        }

        return {
            id: order.orderId,
            enabled: order.enable === true,
            repeat: order.repeat === true,
            weekDay: weekDay,
            firmwareTime: {hour: Math.floor(firmwareMinutes / 60), minute: firmwareMinutes % 60},
            // Una entrada por día, en UTC: la interfaz la pasa a la hora del navegador
            utc: days.map(day => {
                return {
                    dow: (((day + dayShift) % 7) + 7) % 7,
                    hour: Math.floor(utcMinutes / 60),
                    minute: utcMinutes % 60
                };
            }),
            cleanMode: order.cleanInfo?.cleanMode ?? null,
            fanSpeed: order.cleanInfo?.windPower ?? null,
            twice: order.cleanInfo?.twiceClean === true
        };
    }
}

module.exports = CecotecFirmwareOrders;

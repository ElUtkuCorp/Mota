const hashlru = require("hashlru");
const isInSubnet = require("is-in-subnet");
const Logger = require("../../Logger");
const Tools = require("../../utils/Tools");

const IPAccessLRU = hashlru(15);

/**
 *
 * @param {object} req
 * @param {object} res
 * @param {Function} next
 */
module.exports = function checkExternalAccess(req, res, next) {
    if (isAllowed(req.ip)) {
        next();
    } else {
        Logger.warn(`Blocked external request to ${req.url} from ${req.ip}`);

        res.status(418).send("External access to Valetudo is blocked.");
    }
};

function isLocalIPv6Subnet(ip) {
    // Limit requests to GET_NETWORK_INTERFACES by checking for IP-Version first
    if (!isInSubnet.isIPv6(ip)) {
        return false;
    }

    // If a IPv6 subnet of the robot matches the origin IP, the request must come from the local network
    return !!Tools
        .GET_NETWORK_INTERFACES()
        .find(i => {
            return i.family === "IPv6" && isInSubnet.check(ip, i.cidr);
        });
}

/**
 * Mota: Tailscale da a sus equipos direcciones del rango CGNAT 100.64.0.0/10, que no son "privadas" para
 * is-in-subnet. Detrás del NAT de casa solo llegan al robot por la red de Tailscale del usuario (el cortafuegos
 * del robot también las admite).
 *
 * @param {string} ip
 * @returns {boolean}
 */
function isTailscale(ip) {
    const ipv4 = ip.startsWith("::ffff:") ? ip.substring(7) : ip;

    return isInSubnet.isIPv4(ipv4) && isInSubnet.check(ipv4, "100.64.0.0/10");
}

function isAllowed(ip) {
    // IPv6 lookup is expensive, so we've decided to cache all the allow checks here in an LRU
    if (IPAccessLRU.has(ip)) {
        return IPAccessLRU.get(ip);
    }

    let allowed = false;
    try {
        /* See https://github.com/jshttp/on-finished/issues/8 for why req.ip can be undefined
           Quote:
             req.url and such are strings. req.ip is a getter property that calls req.remoteAddress that is a getter
             that does a network socket call, so its value depends on the state of the socket
         */
        allowed = ip !== undefined && (isInSubnet.isPrivate(ip) || isInSubnet.isLocalhost(ip) || isLocalIPv6Subnet(ip) || isTailscale(ip));
    } catch (e) {
        Logger.warn("Error during external access check", e);
    }

    IPAccessLRU.set(ip, allowed);
    return allowed;
}

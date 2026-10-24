const assert = require("node:assert");
const { describe, it } = require("node:test");

const CecotecMotaRouter = require("../../../../lib/robots/cecotec/CecotecMotaRouter");

describe("CecotecMotaRouter diagnostics parsers", () => {
    it("parses iwconfig output from the robot", () => {
        const wifi = CecotecMotaRouter.PARSE_IWCONFIG([
            "wlan0     IEEE 802.11bgn  ESSID:\"Slax\"  ",
            "          Mode:Managed  Frequency:2.462 GHz  Access Point: A0:8A:06:36:FD:0F   ",
            "          Bit Rate=72.2 Mb/s   Tx-Power=12 dBm   ",
            "          Link Quality=65/70  Signal level=-45 dBm  "
        ].join("\n"));

        assert.deepStrictEqual(wifi, {
            ssid: "Slax", frequencyGhz: 2.462, bitRateMbps: 72.2, txPowerDbm: 12, signalDbm: -45, linkQuality: 93
        });
    });

    it("parses the LANONLY firewall chain and recent blocks", () => {
        const firewall = CecotecMotaRouter.PARSE_FIREWALL([
            "Chain LANONLY (1 references)",
            "    pkts      bytes target     prot opt in     out     source               destination",
            "       0        0 ACCEPT     udp  --  *      *       0.0.0.0/0            0.0.0.0/0            udp dpt:123",
            "      12      912 REJECT     all  --  *      *       0.0.0.0/0            0.0.0.0/0            reject-with icmp-port-unreachable"
        ].join("\n"), "[  95.5] LANONLY-block: IN= OUT=wlan0 SRC=192.168.0.42 DST=20.250.119.72 LEN=60 PROTO=TCP SPT=40000 DPT=443\n");

        assert.strictEqual(firewall.active, true);
        assert.strictEqual(firewall.blockedPackets, 12);
        assert.deepStrictEqual(firewall.recentBlocks, [{ destination: "20.250.119.72", protocol: "TCP", port: 443 }]);
    });
});

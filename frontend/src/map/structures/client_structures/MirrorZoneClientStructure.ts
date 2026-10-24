import RestrictedZoneClientStructure from "./RestrictedZoneClientStructure";

/**
 * Mota: zona de espejo. Se edita igual que una zona prohibida (rectángulo alineado con los ejes),
 * pero se dibuja con otro color para no confundirlas.
 */
class MirrorZoneClientStructure extends RestrictedZoneClientStructure {
    public static readonly TYPE = "MirrorZoneClientStructure";

    protected activeStyle : { stroke: string, fill: string } = {
        stroke: "rgb(56, 189, 248)",
        fill: "rgba(56, 189, 248, 0)"
    };

    protected style : { stroke: string, fill: string } = {
        stroke: "rgb(56, 189, 248)",
        fill: "rgba(56, 189, 248, 0.35)"
    };
}

export default MirrorZoneClientStructure;

import BaseMap, {MapContainer, MapProps, MapState} from "./BaseMap";
import React from "react";
import {Box, useTheme} from "@mui/material";
import {RawMapData} from "../api";

/**
 * Mota: mapa de solo consulta, con el mismo dibujo que el mapa en vivo (habitaciones, paredes, recorrido, base y
 * robot) pero sin acciones. Se usa en el historial, en las versiones del mapa y en el control manual.
 * Se puede mover y ampliar como el mapa en vivo.
 */
interface StaticMapProps extends MapProps {
    // Mueve el robot de forma animada entre posiciones (solo para mapas que se actualizan en vivo)
    animateRobot?: boolean;
}

class StaticMap extends BaseMap<StaticMapProps, MapState> {
    constructor(props: StaticMapProps) {
        super(props);

        this.robotAnimationEnabled = props.animateRobot === true;
    }

    render(): React.ReactElement {
        return (
            <MapContainer style={{overflow: "hidden"}}>
                <canvas
                    ref={this.canvasRef}
                    style={{
                        width: "100%",
                        height: "100%",
                        imageRendering: "crisp-edges"
                    }}
                />
            </MapContainer>
        );
    }
}

export const MotaMapView = ({rawMap, height, animateRobot}: {
    rawMap: RawMapData,
    height: number | string,
    animateRobot?: boolean
}): React.ReactElement => {
    const theme = useTheme();

    return (
        <Box sx={{position: "relative", height: height, width: "100%", borderRadius: 2, overflow: "hidden"}}>
            <StaticMap rawMap={rawMap} paletteMode={theme.palette.mode} animateRobot={animateRobot}/>
        </Box>
    );
};

export default StaticMap;

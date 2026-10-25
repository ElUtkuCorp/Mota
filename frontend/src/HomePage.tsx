import {Box, Paper, useTheme} from "@mui/material";
import {useIsMobileView} from "./hooks";
import LiveMapPage from "./map/LiveMapPage";
import CleanPanel from "./controls/CleanPanel";
import MapStatusPill from "./controls/MapStatusPill";
import React from "react";

// Mota: tarjeta del mapa en vivo con la píldora de estado encima
const LiveMapCard: React.FunctionComponent<{ height: string | number }> = ({height}): React.ReactElement => {
    const theme = useTheme();

    return (
        <Paper
            elevation={1}
            sx={{
                position: "relative",
                overflow: "hidden",
                height: height,
                minHeight: 280,
                backgroundColor: theme.palette.mota.mapBackground,
                display: "flex",
                flexDirection: "column",
            }}
        >
            <LiveMapPage/>
            <Box
                sx={{
                    position: "absolute",
                    top: 12,
                    left: 12,
                    right: 12,
                    pointerEvents: "none",
                    zIndex: 1,
                }}
            >
                <MapStatusPill/>
            </Box>
        </Paper>
    );
};

const HomePage = (): React.ReactElement => {
    const mobileView = useIsMobileView();

    if (mobileView) {
        // Móvil: todo apilado (mapa, qué limpiar, opciones, potencia) y la barra de acciones fija abajo
        return (
            <Box
                sx={{
                    flex: "1 1 0",
                    minHeight: 0,
                    overflowY: "auto",
                    overflowX: "hidden",
                    px: 1.5,
                    pt: 1.5,
                }}
            >
                <Box sx={{mb: 1.5}}>
                    <LiveMapCard height="min(50vh, 460px)"/>
                </Box>
                <CleanPanel stickyActions={true}/>
            </Box>
        );
    }

    // Tableta y escritorio: mapa grande en el centro y panel de control a la derecha
    return (
        <Box
            sx={{
                flex: "1 1 0",
                minHeight: 0,
                display: "flex",
                flexDirection: "row",
                gap: 2,
                p: 2,
                overflow: "hidden",
            }}
        >
            <Box sx={{flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column"}}>
                <LiveMapCard height="100%"/>
            </Box>
            <Box
                sx={{
                    flex: "0 0 auto",
                    width: {sm: 340, lg: 380},
                    overflowY: "auto",
                    pr: 0.5,
                }}
            >
                <CleanPanel/>
            </Box>
        </Box>
    );
};

export default HomePage;

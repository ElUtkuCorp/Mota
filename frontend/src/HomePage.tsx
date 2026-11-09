import {alpha, Box, ButtonBase, Paper, Tooltip, Typography, useTheme} from "@mui/material";
import {
    Route as PathIcon,
    Texture as CoverageIcon,
    VisibilityOff as HiddenIcon,
} from "@mui/icons-material";
import {useTranslation} from "react-i18next";
import {useIsMobileView} from "./hooks";
import LiveMapPage from "./map/LiveMapPage";
import CleanPanel from "./controls/CleanPanel";
import MapRecoveryNotice from "./controls/MapRecoveryNotice";
import MapStatusPill from "./controls/MapStatusPill";
import {LiveMapPathView, setLiveMapPathView, useLiveMapControl} from "./map/liveMapControl";
import React from "react";

// Mota: cómo se ve el recorrido en el mapa en vivo. La cobertura es el mismo recorrido con un trazo grueso debajo,
// así que es un selector de tres posiciones y no dos casillas (ocultar + cobertura no tendría sentido)
const PATH_VIEWS: Array<{ value: LiveMapPathView, icon: React.ReactElement }> = [
    {value: "path", icon: <PathIcon fontSize="small"/>},
    {value: "coverage", icon: <CoverageIcon fontSize="small"/>},
    {value: "hidden", icon: <HiddenIcon fontSize="small"/>},
];

const PathViewSelector: React.FunctionComponent = (): React.ReactElement => {
    const {t} = useTranslation();
    const theme = useTheme();
    const pathView = useLiveMapControl(state => {
        return state.pathView;
    });

    return (
        <Box
            role="radiogroup"
            aria-label={t("home.path.label")}
            sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.25,
                p: 0.25,
                borderRadius: 999,
                backgroundColor: alpha(theme.palette.background.paper, 0.92),
                backdropFilter: "blur(6px)",
                boxShadow: theme.shadows[2],
                pointerEvents: "auto",
            }}
        >
            {PATH_VIEWS.map(option => {
                const selected = option.value === pathView;
                const label = t(`home.path.${option.value}`);

                return (
                    <Tooltip key={option.value} title={label}>
                        <ButtonBase
                            role="radio"
                            aria-checked={selected}
                            aria-label={label}
                            onClick={() => {
                                setLiveMapPathView(option.value);
                            }}
                            sx={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 0.75,
                                minHeight: 32,
                                minWidth: 36,
                                px: selected ? 1.25 : 1,
                                borderRadius: 999,
                                backgroundColor: selected ? alpha(theme.palette.primary.main, 0.14) : "transparent",
                                color: selected ? theme.palette.primary.main : theme.palette.text.secondary,
                            }}
                        >
                            {option.icon}
                            {selected && (
                                <Typography component="span" sx={{fontSize: "0.85rem", fontWeight: 600}} noWrap>
                                    {label}
                                </Typography>
                            )}
                        </ButtonBase>
                    </Tooltip>
                );
            })}
        </Box>
    );
};

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
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 1,
                }}
            >
                <MapStatusPill/>
                <Box sx={{ml: "auto"}}>
                    <PathViewSelector/>
                </Box>
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
                <MapRecoveryNotice sx={{mb: 1.5}}/>
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
                <MapRecoveryNotice sx={{mb: 2}}/>
                <CleanPanel/>
            </Box>
        </Box>
    );
};

export default HomePage;

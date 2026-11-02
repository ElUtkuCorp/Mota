import {Box, Button, CircularProgress, styled, Typography, useTheme} from "@mui/material";
import {
    Capability,
    useMotaMapRetouchMutation,
    useMotaMapRetouchQuery,
    useMotaMirrorsQuery,
    useRobotMapQuery,
    useRobotStatusQuery
} from "../api";
import {useCapabilitiesSupported} from "../CapabilitiesProvider";
import EditMap, { mode } from "./EditMap";
import {useSnackbar} from "notistack";
import React from "react";
import {useTranslation} from "react-i18next";


const Container = styled(Box)({
    flex: "1",
    height: "100%",
    display: "flex",
    flexFlow: "column",
    justifyContent: "center",
    alignItems: "center",
});

const EditMapPage = (props: {
    mode: mode;
}): React.ReactElement => {
    const {t} = useTranslation();
    const {
        data: mapData,
        isPending: mapIsPending,
        isError: mapLoadError,
        refetch: refetchMap
    } = useRobotMapQuery();
    const {
        data: robotStatus,
        isPending: robotStatusPending
    } = useRobotStatusQuery();

    const [
        combinedVirtualRestrictionsCapabilitySupported,

        mapSegmentEditCapabilitySupported,
        mapSegmentRenameCapabilitySupported,
        mapSegmentMaterialControlCapabilitySupported,

        mapAnnotationsCapabilitySupported,
    ] = useCapabilitiesSupported(
        Capability.CombinedVirtualRestrictions,

        Capability.MapSegmentEdit,
        Capability.MapSegmentRename,
        Capability.MapSegmentMaterialControl,

        Capability.MapAnnotations
    );

    // Mota: zonas de espejo (y, de paso, si el robot tiene la API propia de Mota)
    const {
        data: mirrorZones,
        isPending: mirrorZonesPending,
        isError: mirrorZonesLoadError,
        refetch: refetchMirrorZones
    } = useMotaMirrorsQuery();
    const motaApiAvailable = mirrorZones !== undefined;

    // Mota: retoques del mapa. Las islas se recalculan con cada mapa que llega
    const {
        data: retouch,
        isPending: retouchPending,
        isError: retouchLoadError,
        refetch: refetchRetouch
    } = useMotaMapRetouchQuery(props.mode === "retouch");
    const {
        mutate: sendRetouchAction,
        isPending: retouchActionPending
    } = useMotaMapRetouchMutation();
    const mapNonce = mapData?.metaData.nonce;

    React.useEffect(() => {
        if (props.mode === "retouch" && mapNonce !== undefined) {
            refetchRetouch().catch(() => {
                /* intentional: el error ya lo muestra la consulta */
            });
        }
    }, [props.mode, mapNonce, refetchRetouch]);

    const theme = useTheme();
    const {enqueueSnackbar} = useSnackbar();

    let helpText = "";

    if (props.mode === "segments") {
        helpText = t("help.segmentEdit");
    } else if (props.mode === "virtual_restrictions") {
        helpText = t("help.virtualRestrictionEdit");
    } else if (props.mode === "annotations") {
        helpText = t("help.mapAnnotations");
    } else if (props.mode === "mirrors") {
        helpText = t("help.mirrorEdit");
    } else if (props.mode === "retouch") {
        helpText = t("help.retouchEdit");
    }

    if (props.mode === "mirrors" && mirrorZonesLoadError) {
        return (
            <Container>
                <Typography color="error">{t("map.mirrors.loadError")}</Typography>
                <Box m={1}/>
                <Button color="primary" variant="contained" onClick={() => {
                    return refetchMirrorZones();
                }}>
                    {t("common.retry")}
                </Button>
            </Container>
        );
    }

    if (props.mode === "retouch" && retouchLoadError && !retouch) {
        return (
            <Container>
                <Typography color="error">{t("map.retouch.loadError")}</Typography>
                <Box m={1}/>
                <Button color="primary" variant="contained" onClick={() => {
                    return refetchRetouch();
                }}>
                    {t("common.retry")}
                </Button>
            </Container>
        );
    }

    if (mapLoadError) {
        return (
            <Container>
                <Typography color="error">{t("map.loadError")}</Typography>
                <Box m={1}/>
                <Button color="primary" variant="contained" onClick={() => {
                    return refetchMap();
                }}>
                    {t("common.retry")}
                </Button>
            </Container>
        );
    }

    if (
        (!mapData && mapIsPending) ||
        (!robotStatus && robotStatusPending) ||
        (props.mode === "mirrors" && !mirrorZones && mirrorZonesPending) ||
        (props.mode === "retouch" && !retouch && retouchPending)
    ) {
        return (
            <Container>
                <CircularProgress/>
            </Container>
        );
    }

    if (!mapData) {
        return (
            <Container>
                <Typography align="center">{t("map.noMapData")}</Typography>
            </Container>
        );
    }

    if (!robotStatus) {
        return (
            <Container>
                <Typography align="center">{t("map.noRobotStatus")}</Typography>
            </Container>
        );
    }

    return <EditMap
        rawMap={mapData}
        paletteMode={theme.palette.mode}
        mode={props.mode}
        helpText={helpText}
        robotStatus={robotStatus}
        mirrorZones={mirrorZones}
        motaApiAvailable={motaApiAvailable}
        retouch={retouch}
        retouchBusy={retouchActionPending}
        onRetouchAction={sendRetouchAction}
        enqueueSnackbar={enqueueSnackbar}

        supportedCapabilities={{
            [Capability.CombinedVirtualRestrictions]: combinedVirtualRestrictionsCapabilitySupported,

            [Capability.MapSegmentEdit]: mapSegmentEditCapabilitySupported,
            [Capability.MapSegmentRename]: mapSegmentRenameCapabilitySupported,
            [Capability.MapSegmentMaterialControl]: mapSegmentMaterialControlCapabilitySupported,
            [Capability.MapAnnotations]: mapAnnotationsCapabilitySupported
        }}
    />;
};

export default EditMapPage;

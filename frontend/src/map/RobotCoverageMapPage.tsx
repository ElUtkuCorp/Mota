import {Box, Button, CircularProgress, styled, Typography, useTheme} from "@mui/material";
import {
    useRobotMapQuery,
    useRobotStatusQuery
} from "../api";
import RobotCoverageMap from "./RobotCoverageMap";
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

const RobotCoverageMapPage = (): React.ReactElement => {
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

    const theme = useTheme();

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

    if ((!mapData && mapIsPending) || (!robotStatus && robotStatusPending)) {
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

    return <RobotCoverageMap
        rawMap={mapData}
        paletteMode={theme.palette.mode}
        helpText={t("help.robotCoverageMap")}
    />;
};

export default RobotCoverageMapPage;

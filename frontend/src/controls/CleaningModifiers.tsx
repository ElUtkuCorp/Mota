import {Checkbox, FormControlLabel, Grid2, Tooltip} from "@mui/material";
import {Tune as CleaningModifiersIcon} from "@mui/icons-material";
import React from "react";
import {
    Capability,
    useCarpetModeStateMutation,
    useCarpetModeStateQuery,
    useCleanRouteMutation,
    useCleanRouteQuery,
} from "../api";
import {useCapabilitiesSupported} from "../CapabilitiesProvider";
import ControlsCard from "./ControlsCard";
import {useTranslation} from "react-i18next";

/**
 * Mota: opciones que acompañan a cualquier modo de limpieza (aspirar, fregar, bordes, espiral):
 * modo alfombra y limpieza x2 (sin marcar = una pasada).
 */
const CleaningModifiers = (): React.ReactElement | null => {
    const {t} = useTranslation();
    const [carpetModeSupported, cleanRouteSupported] = useCapabilitiesSupported(
        Capability.CarpetModeControl,
        Capability.CleanRouteControl
    );

    if (!carpetModeSupported && !cleanRouteSupported) {
        return null;
    }

    return (
        <ControlsCard icon={CleaningModifiersIcon} title={t("controls.cleaningModifiers.title")}>
            <Grid2 container direction="row" columnSpacing={2}>
                {cleanRouteSupported && <DoubleCleaningCheckbox/>}
                {carpetModeSupported && <CarpetModeCheckbox/>}
            </Grid2>
        </ControlsCard>
    );
};

const DoubleCleaningCheckbox = (): React.ReactElement => {
    const {t} = useTranslation();
    const {data: route, isPending, isError} = useCleanRouteQuery();
    const {mutate: setRoute, isPending: isUpdating} = useCleanRouteMutation();

    return (
        <Tooltip title={t("controls.cleaningModifiers.doubleHelp")}>
            <FormControlLabel
                control={
                    <Checkbox
                        checked={route === "intensive"}
                        disabled={isPending || isError || isUpdating}
                        onChange={(e) => {
                            setRoute(e.target.checked ? "intensive" : "normal");
                        }}
                    />
                }
                label={t("controls.cleaningModifiers.double")}
            />
        </Tooltip>
    );
};

const CarpetModeCheckbox = (): React.ReactElement => {
    const {t} = useTranslation();
    const {data: carpetMode, isPending, isError} = useCarpetModeStateQuery();
    const {mutate: setCarpetMode, isPending: isUpdating} = useCarpetModeStateMutation();

    return (
        <Tooltip title={t("controls.cleaningModifiers.carpetHelp")}>
            <FormControlLabel
                control={
                    <Checkbox
                        checked={carpetMode?.enabled === true}
                        disabled={isPending || isError || isUpdating}
                        onChange={(e) => {
                            setCarpetMode(e.target.checked);
                        }}
                    />
                }
                label={t("controls.cleaningModifiers.carpet")}
            />
        </Tooltip>
    );
};

export default CleaningModifiers;

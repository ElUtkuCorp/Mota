import {
    MOTA_MAX_MIRROR_ZONES,
    MotaMirrorZone,
    StatusState,
    useMotaMirrorsMutation,
    useMotaMirrorsQuery,
    ValetudoRestrictedZone,
    ValetudoRestrictedZoneType
} from "../../../api";
import React from "react";
import {CircularProgress, Grid2, Paper, Typography} from "@mui/material";
import {ActionButton} from "../../Styled";
import MirrorZoneClientStructure from "../../structures/client_structures/MirrorZoneClientStructure";
import {PointCoordinates} from "../../utils/types";
import {
    Save as SaveIcon,
    Refresh as RefreshIcon,
    Clear as ClearIcon,
    Flip as MirrorIcon,
} from "@mui/icons-material";
import {useTranslation} from "react-i18next";

// Mota: las zonas de espejo se guardan en píxeles de las capas del mapa con los extremos incluidos,
// mientras que el rectángulo del editor va de x0 a x2 (el píxel x2 ya queda fuera).
export const mirrorZoneFromClientStructure = (structure: MirrorZoneClientStructure): MotaMirrorZone => {
    const xs = [structure.x0, structure.x1, structure.x2, structure.x3];
    const ys = [structure.y0, structure.y1, structure.y2, structure.y3];
    const minX = Math.round(Math.min(...xs));
    const minY = Math.round(Math.min(...ys));
    const maxX = Math.round(Math.max(...xs));
    const maxY = Math.round(Math.max(...ys));

    return {
        x0: minX,
        y0: minY,
        x1: Math.max(minX, maxX - 1),
        y1: Math.max(minY, maxY - 1)
    };
};

export const mirrorZoneToClientStructure = (zone: MotaMirrorZone, active: boolean): MirrorZoneClientStructure => {
    const x0 = Math.min(zone.x0, zone.x1);
    const y0 = Math.min(zone.y0, zone.y1);
    const x1 = Math.max(zone.x0, zone.x1) + 1;
    const y1 = Math.max(zone.y0, zone.y1) + 1;

    return new MirrorZoneClientStructure(
        x0, y0,
        x1, y0,
        x1, y1,
        x0, y1,
        active
    );
};

const getMirrorZoneKey = (zone: MotaMirrorZone): string => {
    return [zone.x0, zone.y0, zone.x1, zone.y1].join(",");
};

interface MirrorActionsProperties {
    robotStatus: StatusState,
    mirrorZones: Array<MirrorZoneClientStructure>,
    restrictedZonesSupported: boolean,

    convertPixelCoordinatesToCMSpace(coordinates: PointCoordinates) : PointCoordinates

    onAddMirrorZone(): void,

    onSave(): void;
    onRefresh(zones: Array<MotaMirrorZone>): void;
    onClear(): void;
}

const MirrorActions = (
    props: MirrorActionsProperties
): React.ReactElement => {
    const {t} = useTranslation();
    const {
        mirrorZones,
        restrictedZonesSupported,
        convertPixelCoordinatesToCMSpace,
        onAddMirrorZone,
        onSave,
        onRefresh,
        onClear
    } = props;

    const {
        data: savedMirrorZones,
        refetch: refetchMirrorZones,
        isFetching: mirrorZonesFetching
    } = useMotaMirrorsQuery();

    const {
        mutate: saveMirrorZones,
        isPending: mirrorZonesSaving
    } = useMotaMirrorsMutation({
        onSuccess: onSave
    });

    const canEdit = props.robotStatus.value === "docked";
    const limitReached = mirrorZones.length >= MOTA_MAX_MIRROR_ZONES;

    const handleSaveClick = React.useCallback(() => {
        if (!canEdit) {
            return;
        }

        const savedKeys = new Set((savedMirrorZones ?? []).map(getMirrorZoneKey));
        const zones: Array<MotaMirrorZone> = [];
        const newRestrictedZones: Array<ValetudoRestrictedZone> = [];

        mirrorZones.forEach(structure => {
            const zone = mirrorZoneFromClientStructure(structure);

            zones.push(zone);

            // Solo las zonas nuevas (o movidas) añaden una zona prohibida; las que ya estaban no se tocan
            if (restrictedZonesSupported && !savedKeys.has(getMirrorZoneKey(zone))) {
                const x0 = zone.x0;
                const y0 = zone.y0;
                const x1 = zone.x1 + 1;
                const y1 = zone.y1 + 1;

                newRestrictedZones.push({
                    type: ValetudoRestrictedZoneType.Regular,
                    points: {
                        pA: convertPixelCoordinatesToCMSpace({x: x0, y: y0}),
                        pB: convertPixelCoordinatesToCMSpace({x: x1, y: y0}),
                        pC: convertPixelCoordinatesToCMSpace({x: x1, y: y1}),
                        pD: convertPixelCoordinatesToCMSpace({x: x0, y: y1})
                    }
                });
            }
        });

        saveMirrorZones({
            zones: zones,
            newRestrictedZones: newRestrictedZones
        });
    }, [canEdit, savedMirrorZones, mirrorZones, restrictedZonesSupported, convertPixelCoordinatesToCMSpace, saveMirrorZones]);

    const handleRefreshClick = React.useCallback(() => {
        refetchMirrorZones().then(({data}) => {
            if (data) {
                onRefresh(data);
            }
        }).catch(() => {
            /* intentional: el error ya lo muestra la consulta */
        });
    }, [refetchMirrorZones, onRefresh]);

    return (
        <Grid2 container spacing={1} direction="row-reverse" flexWrap="wrap-reverse">
            {
                canEdit &&

                <Grid2>
                    <ActionButton
                        disabled={mirrorZonesSaving}
                        color="inherit"
                        size="medium"
                        variant="extended"
                        onClick={handleSaveClick}
                    >
                        <SaveIcon style={{marginRight: "0.25rem", marginLeft: "-0.25rem"}}/>
                        {t("common.save")}
                        {mirrorZonesSaving && (
                            <CircularProgress
                                color="inherit"
                                size={18}
                                style={{marginLeft: 10}}
                            />
                        )}
                    </ActionButton>
                </Grid2>
            }
            {
                canEdit &&

                <Grid2>
                    <ActionButton
                        color="inherit"
                        size="medium"
                        variant="extended"
                        disabled={mirrorZonesSaving || limitReached}
                        onClick={onAddMirrorZone}
                    >
                        <MirrorIcon style={{marginRight: "0.25rem", marginLeft: "-0.25rem"}}/>
                        {t("map.mirrors.addCount", {count: mirrorZones.length, max: MOTA_MAX_MIRROR_ZONES})}
                    </ActionButton>
                </Grid2>
            }
            {
                canEdit &&

                <Grid2>
                    <ActionButton
                        color="inherit"
                        size="medium"
                        disabled={mirrorZones.length === 0 || mirrorZonesSaving}
                        variant="extended"
                        onClick={onClear}
                    >
                        <ClearIcon style={{marginRight: "0.25rem", marginLeft: "-0.25rem"}}/>
                        {t("map.actions.clear")}
                    </ActionButton>
                </Grid2>
            }
            {
                canEdit &&

                <Grid2>
                    <ActionButton
                        color="inherit"
                        size="medium"
                        variant="extended"
                        disabled={mirrorZonesFetching || mirrorZonesSaving}
                        onClick={handleRefreshClick}
                    >
                        <RefreshIcon style={{marginRight: "0.25rem", marginLeft: "-0.25rem"}}/>
                        {t("common.refresh")}
                    </ActionButton>
                </Grid2>
            }
            {
                !canEdit &&
                <Grid2>
                    <Typography variant="caption" color="textSecondary">
                        {t("map.mirrors.requiresDocked")}
                    </Typography>
                </Grid2>
            }
            <Grid2 size={12}>
                <Paper
                    variant="outlined"
                    sx={{
                        px: 1.5,
                        py: 1,
                        maxWidth: "36rem",
                        marginLeft: "auto",
                        opacity: 0.92
                    }}
                >
                    <Typography variant="caption" color="textSecondary" component="p">
                        {t("map.mirrors.explanation")}
                        {limitReached && <><br/>{t("map.mirrors.limitReached", {max: MOTA_MAX_MIRROR_ZONES})}</>}
                    </Typography>
                </Paper>
            </Grid2>
        </Grid2>
    );
};

export default MirrorActions;

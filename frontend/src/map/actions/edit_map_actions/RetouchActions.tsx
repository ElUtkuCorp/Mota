import {
    MotaMapRetouchAction,
    MotaMapRetouchStatus,
    StatusState,
    useMotaMapRotationMutation
} from "../../../api";
import React from "react";
import {Box, Grid2, Paper, ToggleButton, ToggleButtonGroup, Typography} from "@mui/material";
import {ActionButton} from "../../Styled";
import {
    ClearAll as ClearAllIcon,
    Crop32 as WallIcon,
    FormatPaint as FloorIcon,
    HideImage as HideIcon,
    Image as ShowIcon,
    Layers as IslandsIcon,
    RotateLeft as RotateLeftIcon,
    RotateRight as RotateRightIcon,
    Undo as UndoIcon,
    AutoFixNormal as EraseIcon
} from "@mui/icons-material";
import ConfirmationDialog from "../../../components/ConfirmationDialog";
import {useTranslation} from "react-i18next";
import {addMapRotation, normalizeMapRotation} from "../../utils/mapRotation";

export type RetouchTool = "islands" | "floor" | "wall" | "void";

const BRUSH_RADII = [0, 1, 3];

interface RetouchActionsProperties {
    robotStatus: StatusState,
    retouch: MotaMapRetouchStatus | undefined,
    busy: boolean,
    tool: RetouchTool,
    brushRadius: number,

    onToolChange(tool: RetouchTool): void;
    onBrushRadiusChange(radius: number): void;
    onAction(action: MotaMapRetouchAction): void;
}

// Mota: quitar islas, girar y repintar el mapa. Todo es visual: nada de esto llega al robot
const RetouchActions = (
    props: RetouchActionsProperties
): React.ReactElement => {
    const {t} = useTranslation();
    const {robotStatus, retouch, busy, tool, brushRadius, onToolChange, onBrushRadiusChange, onAction} = props;
    const [clearDialogOpen, setClearDialogOpen] = React.useState(false);

    const {
        mutate: setRotation,
        isPending: rotationPending
    } = useMotaMapRotationMutation();

    const canEdit = robotStatus.value === "docked" && retouch?.usable === true;
    const rotation = normalizeMapRotation(retouch?.rotation);
    const islandCount = retouch?.islands.length ?? 0;
    const hiddenCount = retouch?.hidden.length ?? 0;

    let note = t("map.retouch.islandsHint");
    if (tool !== "islands") {
        note = t("map.retouch.paintHint");
    }

    return (
        <Grid2 container spacing={1} direction="row-reverse" flexWrap="wrap-reverse">
            <Grid2>
                <ActionButton
                    aria-label={t("map.retouch.rotateRight")}
                    title={t("map.retouch.rotateRight")}
                    disabled={rotationPending}
                    color="inherit"
                    size="medium"
                    onClick={() => {
                        setRotation(addMapRotation(rotation, 90));
                    }}
                >
                    <RotateRightIcon/>
                </ActionButton>
            </Grid2>
            <Grid2>
                <ActionButton
                    aria-label={t("map.retouch.rotateLeft")}
                    title={t("map.retouch.rotateLeft")}
                    disabled={rotationPending}
                    color="inherit"
                    size="medium"
                    onClick={() => {
                        setRotation(addMapRotation(rotation, -90));
                    }}
                >
                    <RotateLeftIcon/>
                </ActionButton>
            </Grid2>
            {
                canEdit &&

                <Grid2>
                    <ActionButton
                        color="inherit"
                        size="medium"
                        variant="extended"
                        disabled={busy || retouch?.canUndo !== true}
                        onClick={() => {
                            onAction({type: "undo"});
                        }}
                    >
                        <UndoIcon style={{marginRight: "0.25rem", marginLeft: "-0.25rem"}}/>
                        {t("map.retouch.undo")}
                    </ActionButton>
                </Grid2>
            }
            {
                canEdit && tool === "islands" &&

                <Grid2>
                    <ActionButton
                        color="inherit"
                        size="medium"
                        variant="extended"
                        disabled={busy || islandCount === 0}
                        onClick={() => {
                            onAction({type: "hide"});
                        }}
                    >
                        <HideIcon style={{marginRight: "0.25rem", marginLeft: "-0.25rem"}}/>
                        {t("map.retouch.hideAll", {count: islandCount})}
                    </ActionButton>
                </Grid2>
            }
            {
                canEdit && tool === "islands" && hiddenCount > 0 &&

                <Grid2>
                    <ActionButton
                        color="inherit"
                        size="medium"
                        variant="extended"
                        disabled={busy}
                        onClick={() => {
                            onAction({type: "show"});
                        }}
                    >
                        <ShowIcon style={{marginRight: "0.25rem", marginLeft: "-0.25rem"}}/>
                        {t("map.retouch.showAll", {count: hiddenCount})}
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
                        disabled={busy || (retouch?.editCount ?? 0) === 0}
                        onClick={() => {
                            setClearDialogOpen(true);
                        }}
                    >
                        <ClearAllIcon style={{marginRight: "0.25rem", marginLeft: "-0.25rem"}}/>
                        {t("map.retouch.clear")}
                    </ActionButton>
                </Grid2>
            }
            {
                canEdit &&

                <Grid2 size={12} sx={{display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "flex-end"}}>
                    {
                        tool !== "islands" &&

                        <ToggleButtonGroup
                            exclusive
                            size="small"
                            value={brushRadius}
                            aria-label={t("map.retouch.brush")}
                            sx={{pointerEvents: "auto", backgroundColor: "background.paper"}}
                            onChange={(_, value) => {
                                if (value !== null) {
                                    onBrushRadiusChange(value);
                                }
                            }}
                        >
                            {BRUSH_RADII.map((radius, index) => {
                                return (
                                    <ToggleButton key={radius} value={radius}>
                                        {t(`map.retouch.brushSize.${index}`)}
                                    </ToggleButton>
                                );
                            })}
                        </ToggleButtonGroup>
                    }
                    <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={tool}
                        aria-label={t("map.retouch.tool")}
                        sx={{pointerEvents: "auto", backgroundColor: "background.paper"}}
                        onChange={(_, value) => {
                            if (value !== null) {
                                onToolChange(value);
                            }
                        }}
                    >
                        <ToggleButton value="islands">
                            <IslandsIcon fontSize="small" style={{marginRight: "0.25rem"}}/>
                            {t("map.retouch.tools.islands")}
                        </ToggleButton>
                        <ToggleButton value="floor">
                            <FloorIcon fontSize="small" style={{marginRight: "0.25rem"}}/>
                            {t("map.retouch.tools.floor")}
                        </ToggleButton>
                        <ToggleButton value="wall">
                            <WallIcon fontSize="small" style={{marginRight: "0.25rem"}}/>
                            {t("map.retouch.tools.wall")}
                        </ToggleButton>
                        <ToggleButton value="void">
                            <EraseIcon fontSize="small" style={{marginRight: "0.25rem"}}/>
                            {t("map.retouch.tools.void")}
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Grid2>
            }
            <Grid2 size={12}>
                <Paper
                    variant="outlined"
                    sx={{
                        px: 1.5,
                        py: 1,
                        ml: "auto",
                        maxWidth: "36rem",
                        pointerEvents: "auto"
                    }}
                >
                    <Typography variant="body2" sx={{fontWeight: 600}}>
                        {t("map.retouch.visualOnly")}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                        {canEdit && <Box component="span" sx={{display: {xs: "none", sm: "inline"}}}>{note}</Box>}
                        {robotStatus.value !== "docked" && t("map.retouch.requiresDocked")}
                        {robotStatus.value === "docked" && retouch?.usable === false && t("map.retouch.otherMap")}
                    </Typography>
                </Paper>
            </Grid2>
            <ConfirmationDialog
                title={t("map.retouch.clearConfirmTitle")}
                text={t("map.retouch.clearConfirmText")}
                open={clearDialogOpen}
                onClose={() => {
                    setClearDialogOpen(false);
                }}
                onAccept={() => {
                    onAction({type: "clear"});
                }}
            />
        </Grid2>
    );
};

export default RetouchActions;

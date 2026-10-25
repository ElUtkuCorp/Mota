import {
    Capability,
    MapSegmentMaterial,
    RawMapLayerMaterial,
    StatusState,
    useJoinSegmentsMutation,
    useMapSegmentMaterialControlPropertiesQuery,
    useMotaRoomColorMutation,
    useRenameSegmentMutation,
    useSetSegmentMaterialMutation,
    useSplitSegmentMutation
} from "../../../api";
import React from "react";
import {
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControl,
    FormControlLabel,
    Grid2,
    Radio,
    RadioGroup,
    TextField,
    Typography
} from "@mui/material";
import {ActionButton} from "../../Styled";
import CuttingLineClientStructure from "../../structures/client_structures/CuttingLineClientStructure";
import {PointCoordinates} from "../../utils/types";
import {
    Clear as ClearIcon,
    ContentCut as SplitIcon,
    Dashboard as MaterialIcon,
    JoinFull as JoinIcon,
    Palette as ColorIcon,
} from "@mui/icons-material";
import {AddCuttingLineIcon, RenameIcon} from "../../../components/CustomIcons";
import i18n from "../../../i18n";
import {useTranslation} from "react-i18next";
import SegmentColorDialog from "./SegmentColorDialog";

const getMaterialLabel = (material: MapSegmentMaterial): string => {
    switch (material) {
        case MapSegmentMaterial.Generic:
            return i18n.t("map.segments.materials.generic");
        case MapSegmentMaterial.Tile:
            return i18n.t("map.segments.materials.tile");
        case MapSegmentMaterial.Wood:
            return i18n.t("map.segments.materials.wood");
        case MapSegmentMaterial.WoodHorizontal:
            return i18n.t("map.segments.materials.woodHorizontal");
        case MapSegmentMaterial.WoodVertical:
            return i18n.t("map.segments.materials.woodVertical");
        case MapSegmentMaterial.Carpet:
            return i18n.t("map.segments.materials.carpet");
        case MapSegmentMaterial.CarpetLow:
            return i18n.t("map.segments.materials.carpetLow");
        case MapSegmentMaterial.CarpetHigh:
            return i18n.t("map.segments.materials.carpetHigh");
        default:
            return material;
    }
};

interface SegmentRenameDialogProps {
    open: boolean;
    onClose: () => void;
    currentName: string;
    onRename: (newName: string) => void;
}

const SegmentRenameDialog = (props: SegmentRenameDialogProps) => {
    const {t} = useTranslation();
    const {open, onClose, currentName, onRename} = props;
    const [name, setName] = React.useState(currentName);

    React.useEffect(() => {
        if (open) {
            setName(currentName);
        }
    }, [open, currentName]);

    return (
        <Dialog open={open} onClose={onClose} sx={{userSelect: "none"}}>
            <DialogTitle>{t("map.segments.renameTitle")}</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    {t("map.segments.renameQuestion", {name: currentName})}
                </DialogContentText>
                <TextField
                    autoFocus
                    margin="dense"
                    variant="standard"
                    label={t("map.segments.nameLabel")}
                    fullWidth
                    value={name}
                    onChange={(e) => {
                        setName(e.target.value);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            onRename(name.trim());
                        }
                    }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t("common.cancel")}</Button>
                <Button
                    onClick={() => {
                        onRename(name.trim());
                    }}
                >
                    {t("map.segments.rename")}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

interface SegmentMaterialDialogProps {
    open: boolean;
    onClose: () => void;
    name: string;
    currentMaterial: MapSegmentMaterial;
    onSubmit: (material: MapSegmentMaterial) => void;
}

const SegmentMaterialDialog = (props: SegmentMaterialDialogProps) => {
    const {t} = useTranslation();
    const {open, onClose, name, currentMaterial, onSubmit} = props;
    const [material, setMaterial] = React.useState<MapSegmentMaterial>(currentMaterial);

    const {
        data: materialProperties,
        isPending: materialPropertiesPending
    } = useMapSegmentMaterialControlPropertiesQuery();

    React.useEffect(() => {
        if (open) {
            setMaterial(currentMaterial);
        }
    }, [open, currentMaterial]);

    const supportedMaterials = materialProperties?.supportedMaterials ?? [];

    return (
        <Dialog open={open} onClose={onClose} sx={{userSelect: "none"}}>
            <DialogTitle>{t("map.segments.materialTitle")}</DialogTitle>
            <DialogContent>
                <DialogContentText style={{marginBottom: "1rem"}}>
                    {t("map.segments.materialQuestion", {name: name})}
                </DialogContentText>
                {materialPropertiesPending ? (
                    <CircularProgress/>
                ) : (
                    <FormControl component="fieldset">
                        <RadioGroup
                            value={material}
                            onChange={(e) => setMaterial(e.target.value as MapSegmentMaterial)}
                        >
                            {supportedMaterials.map((material) => (
                                <FormControlLabel
                                    key={material}
                                    value={material}
                                    control={<Radio/>}
                                    label={getMaterialLabel(material)}
                                />
                            ))}
                        </RadioGroup>
                    </FormControl>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t("common.cancel")}</Button>
                <Button
                    onClick={() => {
                        onSubmit(material);
                    }}
                >
                    {t("common.save")}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

interface SegmentActionsProperties {
    robotStatus: StatusState,
    selectedSegmentIds: string[];
    segmentNames: Record<string, string>;
    segmentMaterials: Record<string, RawMapLayerMaterial>;
    // Mota: color elegido por el usuario para cada habitación ("#rrggbb"); sin entrada = automático
    segmentColors: Record<string, string | undefined>;
    // Mota: el robot tiene la API propia de Mota (necesaria para cambiar el color)
    motaApiAvailable: boolean;
    cuttingLine: CuttingLineClientStructure | undefined,

    convertPixelCoordinatesToCMSpace(coordinates: PointCoordinates): PointCoordinates

    supportedCapabilities: {
        [Capability.MapSegmentEdit]: boolean,
        [Capability.MapSegmentRename]: boolean,
        [Capability.MapSegmentMaterialControl]: boolean,
    }

    onAddCuttingLine(): void,

    onClear(): void;
}

const SegmentActions = (
    props: SegmentActionsProperties
): React.ReactElement => {
    const {t} = useTranslation();
    const {
        selectedSegmentIds,
        segmentNames,
        segmentMaterials,
        segmentColors,
        motaApiAvailable,
        cuttingLine,
        convertPixelCoordinatesToCMSpace,
        supportedCapabilities,
        onAddCuttingLine,
        onClear
    } = props;

    const [renameDialogOpen, setRenameDialogOpen] = React.useState(false);
    const [materialDialogOpen, setMaterialDialogOpen] = React.useState(false);
    const [colorDialogOpen, setColorDialogOpen] = React.useState(false);

    const {
        mutate: joinSegments,
        isPending: joinSegmentsExecuting
    } = useJoinSegmentsMutation({
        onSuccess: onClear,
    });
    const {
        mutate: splitSegment,
        isPending: splitSegmentExecuting
    } = useSplitSegmentMutation({
        onSuccess: onClear,
    });
    const {
        mutate: renameSegment,
        isPending: renameSegmentExecuting
    } = useRenameSegmentMutation({
        onSuccess: onClear,
    });
    const {
        mutate: setSegmentMaterial,
        isPending: setSegmentMaterialExecuting
    } = useSetSegmentMaterialMutation({
        onSuccess: onClear,
    });
    const {
        mutate: setRoomColor,
        isPending: setRoomColorExecuting
    } = useMotaRoomColorMutation({
        onSuccess: onClear,
    });

    const canEdit = props.robotStatus.value === "docked";

    const handleSplitClick = React.useCallback(() => {
        if (!canEdit || !cuttingLine || selectedSegmentIds.length !== 1) {
            return;
        }

        splitSegment({
            segment_id: selectedSegmentIds[0],
            pA: convertPixelCoordinatesToCMSpace({
                x: cuttingLine.x0,
                y: cuttingLine.y0
            }),
            pB: convertPixelCoordinatesToCMSpace({
                x: cuttingLine.x1,
                y: cuttingLine.y1
            })
        });
    }, [canEdit, splitSegment, selectedSegmentIds, cuttingLine, convertPixelCoordinatesToCMSpace]);

    const handleJoinClick = React.useCallback(() => {
        if (!canEdit || selectedSegmentIds.length !== 2) {
            return;
        }

        joinSegments({
            segment_a_id: selectedSegmentIds[0],
            segment_b_id: selectedSegmentIds[1],
        });
    }, [canEdit, joinSegments, selectedSegmentIds]);

    const handleRename = React.useCallback((name: string) => {
        if (!canEdit || selectedSegmentIds.length !== 1) {
            return;
        }
        setRenameDialogOpen(false);
        renameSegment({
            segment_id: selectedSegmentIds[0],
            name: name
        });
    }, [canEdit, renameSegment, selectedSegmentIds]);

    const handleSetMaterial = React.useCallback((material: MapSegmentMaterial) => {
        if (!canEdit || selectedSegmentIds.length !== 1) {
            return;
        }
        setMaterialDialogOpen(false);
        setSegmentMaterial({
            segment_id: selectedSegmentIds[0],
            material: material
        });
    }, [canEdit, setSegmentMaterial, selectedSegmentIds]);

    const handleSetColor = React.useCallback((color: string) => {
        if (!canEdit || selectedSegmentIds.length !== 1) {
            return;
        }
        setColorDialogOpen(false);
        setRoomColor({
            id: selectedSegmentIds[0],
            color: color
        });
    }, [canEdit, setRoomColor, selectedSegmentIds]);


    return (
        <Grid2 container spacing={1} direction="row-reverse" flexWrap="wrap-reverse">
            {
                supportedCapabilities[Capability.MapSegmentEdit] &&
                (selectedSegmentIds.length === 1 || selectedSegmentIds.length === 2) &&
                cuttingLine === undefined &&

                <Grid2>
                    <ActionButton
                        disabled={joinSegmentsExecuting || !canEdit || selectedSegmentIds.length !== 2}
                        color="inherit"
                        size="medium"
                        variant="extended"
                        onClick={handleJoinClick}
                    >
                        <JoinIcon style={{marginRight: "0.25rem", marginLeft: "-0.25rem"}}/>
                        {t("map.segments.join", {first: segmentNames[selectedSegmentIds[0]], second: selectedSegmentIds.length === 2 ? segmentNames[selectedSegmentIds[1]] : "?"})}
                        {joinSegmentsExecuting && (
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
                supportedCapabilities[Capability.MapSegmentEdit] &&
                selectedSegmentIds.length === 1 &&
                cuttingLine !== undefined &&

                <Grid2>
                    <ActionButton
                        disabled={splitSegmentExecuting || !canEdit}
                        color="inherit"
                        size="medium"
                        variant="extended"
                        onClick={handleSplitClick}
                    >
                        <SplitIcon style={{marginRight: "0.25rem", marginLeft: "-0.25rem"}}/>
                        {t("map.segments.split", {name: segmentNames[selectedSegmentIds[0]]})}
                        {splitSegmentExecuting && (
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
                supportedCapabilities[Capability.MapSegmentRename] &&
                selectedSegmentIds.length === 1 &&
                cuttingLine === undefined &&

                <Grid2>
                    <ActionButton
                        disabled={renameSegmentExecuting || !canEdit}
                        color="inherit"
                        size="medium"
                        variant="extended"
                        onClick={() => {
                            setRenameDialogOpen(true);
                        }}
                    >
                        <RenameIcon style={{marginRight: "0.25rem", marginLeft: "-0.25rem"}}/>
                        {t("map.segments.rename")}
                        {renameSegmentExecuting && (
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
                motaApiAvailable &&
                selectedSegmentIds.length === 1 &&
                cuttingLine === undefined &&

                <Grid2>
                    <ActionButton
                        disabled={setRoomColorExecuting || !canEdit}
                        color="inherit"
                        size="medium"
                        variant="extended"
                        onClick={() => {
                            setColorDialogOpen(true);
                        }}
                    >
                        <ColorIcon style={{marginRight: "0.25rem", marginLeft: "-0.25rem"}}/>
                        {t("map.segments.color")}
                        {setRoomColorExecuting && (
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
                supportedCapabilities[Capability.MapSegmentMaterialControl] &&
                selectedSegmentIds.length === 1 &&
                cuttingLine === undefined &&

                <Grid2>
                    <ActionButton
                        disabled={setSegmentMaterialExecuting || !canEdit}
                        color="inherit"
                        size="medium"
                        variant="extended"
                        onClick={() => {
                            setMaterialDialogOpen(true);
                        }}
                    >
                        <MaterialIcon style={{marginRight: "0.25rem", marginLeft: "-0.25rem"}}/>
                        {t("map.segments.material")}
                        {setSegmentMaterialExecuting && (
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
                supportedCapabilities[Capability.MapSegmentEdit] &&
                selectedSegmentIds.length === 1 &&
                cuttingLine === undefined &&

                <Grid2>
                    <ActionButton
                        disabled={joinSegmentsExecuting || !canEdit}
                        color="inherit"
                        size="medium"
                        variant="extended"
                        onClick={onAddCuttingLine}
                    >
                        <AddCuttingLineIcon style={{marginRight: "0.25rem", marginLeft: "-0.25rem"}}/>
                        {t("map.segments.cuttingLine")}
                    </ActionButton>
                </Grid2>
            }
            {
                (
                    selectedSegmentIds.length > 0 ||
                    cuttingLine !== undefined
                ) &&

                <Grid2>
                    <ActionButton
                        color="inherit"
                        size="medium"
                        variant="extended"
                        onClick={onClear}
                    >
                        <ClearIcon style={{marginRight: "0.25rem", marginLeft: "-0.25rem"}}/>
                        {t("map.actions.clear")}
                    </ActionButton>
                </Grid2>
            }
            {
                !canEdit &&
                <Grid2>
                    <Typography variant="caption" color="textSecondary">
                        {t("map.segments.requiresDocked")}
                    </Typography>
                </Grid2>
            }
            {
                canEdit &&
                selectedSegmentIds.length === 0 &&
                <Grid2>
                    <Typography variant="caption" color="textSecondary" style={{fontSize: "1em"}}>
                        {t("map.segments.selectToEdit")}
                    </Typography>
                </Grid2>
            }

            {
                supportedCapabilities[Capability.MapSegmentRename] && selectedSegmentIds.length === 1 &&
                <SegmentRenameDialog
                    open={renameDialogOpen}
                    onClose={() => setRenameDialogOpen(false)}
                    currentName={segmentNames[selectedSegmentIds[0]] ?? selectedSegmentIds[0]}
                    onRename={handleRename}
                />
            }

            {
                supportedCapabilities[Capability.MapSegmentMaterialControl] && selectedSegmentIds.length === 1 &&
                <SegmentMaterialDialog
                    open={materialDialogOpen}
                    onClose={() => setMaterialDialogOpen(false)}
                    name={segmentNames[selectedSegmentIds[0]] ?? selectedSegmentIds[0]}
                    currentMaterial={segmentMaterials[selectedSegmentIds[0]] as unknown as MapSegmentMaterial ?? MapSegmentMaterial.Generic}
                    onSubmit={handleSetMaterial}
                />
            }

            {
                motaApiAvailable && selectedSegmentIds.length === 1 &&
                <SegmentColorDialog
                    open={colorDialogOpen}
                    onClose={() => setColorDialogOpen(false)}
                    name={segmentNames[selectedSegmentIds[0]] ?? selectedSegmentIds[0]}
                    currentColor={segmentColors[selectedSegmentIds[0]]}
                    onSubmit={handleSetColor}
                />
            }
        </Grid2>
    );
};

export default SegmentActions;

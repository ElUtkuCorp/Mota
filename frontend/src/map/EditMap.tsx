import BaseMap, {MapContainer, MapProps, MapState} from "./BaseMap";
import {
    Capability,
    MotaMapPaintValue,
    MotaMapRetouchAction,
    MotaMapRetouchStatus,
    MotaMirrorZone,
    RawMapEntityType,
    RawMapLayerMaterial,
    RawMapLayerType,
    StatusState
} from "../api";
import {ActionsContainer} from "./Styled";
import SegmentLabelMapStructure from "./structures/map_structures/SegmentLabelMapStructure";
import SegmentActions from "./actions/edit_map_actions/SegmentActions";
import CuttingLineClientStructure from "./structures/client_structures/CuttingLineClientStructure";
import VirtualWallClientStructure from "./structures/client_structures/VirtualWallClientStructure";
import VirtualRestrictionActions from "./actions/edit_map_actions/VirtualRestrictionActions";
import NoGoAreaClientStructure from "./structures/client_structures/NoGoAreaClientStructure";
import NoMopAreaClientStructure from "./structures/client_structures/NoMopAreaClientStructure";
import HelpDialog from "../components/HelpDialog";
import HelpAction from "./actions/edit_map_actions/HelpAction";
import {ProviderContext} from "notistack";
import React from "react";
import {PathDrawer} from "./PathDrawer";
import ThresholdClientStructure from "./structures/client_structures/ThresholdClientStructure";
import MapAnnotationActions from "./actions/edit_map_actions/MapAnnotationActions";
import CurtainClientStructure from "./structures/client_structures/CurtainClientStructure";
import RampClientStructure from "./structures/client_structures/RampClientStructure";
import i18n from "../i18n";
import MirrorZoneClientStructure from "./structures/client_structures/MirrorZoneClientStructure";
import MirrorActions, {mirrorZoneToClientStructure} from "./actions/edit_map_actions/MirrorActions";
import ResegmentAction from "./actions/edit_map_actions/ResegmentAction";
import RetouchActions, {RetouchTool} from "./actions/edit_map_actions/RetouchActions";
import {PanStartTouchHandlerEvent} from "./utils/touch_handling/events/PanStartTouchHandlerEvent";
import {PanMoveTouchHandlerEvent} from "./utils/touch_handling/events/PanMoveTouchHandlerEvent";
import {PanEndTouchHandlerEvent} from "./utils/touch_handling/events/PanEndTouchHandlerEvent";
import {PinchEndTouchHandlerEvent} from "./utils/touch_handling/events/PinchEndTouchHandlerEvent";
import {PinchStartTouchHandlerEvent} from "./utils/touch_handling/events/PinchStartTouchHandlerEvent";
import {considerHiDPI} from "./utils/helpers";
import {forEachStrokeStamp} from "./utils/mapRetouchStroke";

export type mode = "segments" | "virtual_restrictions" | "annotations" | "mirrors" | "retouch";

// Mota: colores de la capa de edición de retoques
const RETOUCH_COLORS = {
    island: "rgba(245, 158, 11, 0.85)",
    hidden: "rgba(148, 163, 184, 0.5)",
    floor: "rgba(34, 197, 94, 0.7)",
    wall: "rgba(30, 41, 59, 0.85)",
    void: "rgba(239, 68, 68, 0.6)"
};
// Mota: a cuántos píxeles de la pantalla se puede tocar una isla (hay islas de un solo píxel)
const ISLAND_TAP_TOLERANCE = 12;

interface RetouchStroke {
    value: MotaMapPaintValue,
    radius: number,
    points: Array<number>
}

interface EditMapProps extends MapProps {
    supportedCapabilities: {
        [Capability.CombinedVirtualRestrictions]: boolean,

        [Capability.MapSegmentEdit]: boolean,
        [Capability.MapSegmentRename]: boolean
        [Capability.MapSegmentMaterialControl]: boolean

        [Capability.MapAnnotations]: boolean
    }
    mode: mode,
    helpText: string,
    // Mota: zonas de espejo guardadas (solo en el modo "mirrors")
    mirrorZones?: Array<MotaMirrorZone>,
    // Mota: el robot tiene la API propia de Mota (/api/v2/mota/)
    motaApiAvailable?: boolean,
    // Mota: retoques del mapa (solo en el modo "retouch")
    retouch?: MotaMapRetouchStatus,
    retouchBusy?: boolean,
    onRetouchAction?: (action: MotaMapRetouchAction) => void,
    robotStatus: StatusState,
    enqueueSnackbar: ProviderContext["enqueueSnackbar"]
}

interface EditMapState extends MapState {
    segmentNames: Record<string, string>,
    segmentMaterials: Record<string, RawMapLayerMaterial>,
    // Mota: color elegido por el usuario para cada habitación ("#rrggbb")
    segmentColors: Record<string, string | undefined>,
    cuttingLine: CuttingLineClientStructure | undefined,

    virtualWalls: Array<VirtualWallClientStructure>,
    noGoAreas: Array<NoGoAreaClientStructure>,
    noMopAreas: Array<NoMopAreaClientStructure>,

    thresholds: Array<ThresholdClientStructure>,
    curtains: Array<CurtainClientStructure>,
    ramps: Array<RampClientStructure>,

    mirrorZones: Array<MirrorZoneClientStructure>,

    retouchTool: RetouchTool,
    retouchBrushRadius: number,

    helpDialogOpen: boolean
}

class EditMap extends BaseMap<EditMapProps, EditMapState> {
    protected pendingVirtualRestrictionsStructuresUpdate = false;
    protected pendingMapAnnotationsStructuresUpdate = false;

    // Mota: capa del tamaño del mapa con las islas y los trazos, que gira y se mueve con él
    private retouchOverlay: HTMLCanvasElement | undefined;
    private activeStroke: RetouchStroke | undefined;
    // Trazos enviados que todavía no han vuelto en un mapa nuevo
    private sentStrokes: Array<RetouchStroke> = [];

    constructor(props: EditMapProps) {
        super(props);

        this.state = {
            selectedSegmentIds: [],
            dialogOpen: false,
            dialogTitle: "Hello World",
            dialogBody: "This should never be visible",

            segmentNames: {},
            segmentMaterials: {},
            segmentColors: {},
            cuttingLine: undefined,

            virtualWalls: [],
            noGoAreas: [],
            noMopAreas: [],

            thresholds: [],
            curtains: [],
            ramps: [],

            mirrorZones: [],

            retouchTool: "islands",
            retouchBrushRadius: 1,

            helpDialogOpen: false
        };

        this.updateVirtualRestrictionClientStructures(props.mode !== "virtual_restrictions");
        this.updateMapAnnotationsClientStructures(props.mode !== "annotations");
        this.updateMirrorZoneClientStructures(props.mode === "mirrors" ? (props.mirrorZones ?? []) : undefined);
    }

    protected async updateDrawableComponents(): Promise<void> {
        await new Promise<void>((resolve) => {
            this.drawableComponentsMutex.take(() => {
                resolve();
            });
        });


        this.drawableComponents = [];

        await this.mapLayerManager.draw(this.props.rawMap, this.props.paletteMode);
        this.drawableComponents.push(this.mapLayerManager.getCanvas());

        this.updateStructures(this.props.mode);

        if (this.props.mode === "retouch") {
            this.drawableComponents.push(this.getRetouchOverlay());
            this.drawRetouchOverlay();
        }

        if (this.props.mode === "virtual_restrictions" || this.props.mode === "mirrors") {
            const pathsImage = await PathDrawer.drawPaths( {
                pathMapEntities: this.props.rawMap.entities.filter(e => {
                    return e.type === RawMapEntityType.Path;
                }),
                mapWidth: this.props.rawMap.size.x,
                mapHeight: this.props.rawMap.size.y,
                pixelSize: this.props.rawMap.pixelSize,
                paletteMode: this.props.paletteMode,
                opacity: 0.5
            });

            this.drawableComponents.push(pathsImage);
        }

        this.updateState();

        this.drawableComponentsMutex.leave();
    }

    // Mota: en el editor de retoques no se ve el robot ni el recorrido, y la segunda capa es la de edición
    protected async updateEntityDrawables(): Promise<void> {
        if (this.props.mode !== "retouch") {
            await super.updateEntityDrawables();
        }
    }

    private updateStructures(mode: mode) : void {
        this.structureManager.updateMapStructuresFromMapData({
            metaData: this.props.rawMap.metaData,
            size: this.props.rawMap.size,
            pixelSize: this.props.rawMap.pixelSize,
            layers: this.props.rawMap.layers,
            entities: this.props.rawMap.entities.filter(e => {
                switch (e.type) {
                    case RawMapEntityType.ChargerLocation:
                    case RawMapEntityType.Carpet:
                        return true;
                    // Mota: en el editor de espejos se ven (sin poder editarlas) las zonas prohibidas
                    case RawMapEntityType.NoGoArea:
                        return mode === "mirrors" || mode === "retouch";
                    default:
                        return false;
                }
            })
        });

        if (mode === "virtual_restrictions" || mode === "mirrors" || mode === "retouch") {
            // remove all segment labels
            this.structureManager.getMapStructures().forEach(s => {
                if (s.type === SegmentLabelMapStructure.TYPE) {
                    this.structureManager.removeMapStructure(s);
                }
            });
        }
    }


    protected updateState() : void {
        super.updateState();

        const segmentNames = {} as Record<string, string>;
        const segmentMaterials = {} as Record<string, RawMapLayerMaterial>;
        this.structureManager.getMapStructures().forEach(s => {
            if (s.type === SegmentLabelMapStructure.TYPE) {
                const label = s as SegmentLabelMapStructure;

                segmentNames[label.id] = label.name ?? label.id;
                segmentMaterials[label.id] = label.material ?? RawMapLayerMaterial.Generic;
            }
        });


        const segmentColors = {} as Record<string, string | undefined>;
        this.props.rawMap.layers.forEach(l => {
            if (l.type === RawMapLayerType.Segment && l.metaData.segmentId !== undefined && typeof l.metaData.color === "string") {
                segmentColors[l.metaData.segmentId] = l.metaData.color;
            }
        });

        this.setState({
            segmentNames: segmentNames,
            segmentMaterials: segmentMaterials,
            segmentColors: segmentColors,
            cuttingLine: this.structureManager.getClientStructures().find(s => {
                if (s.type === CuttingLineClientStructure.TYPE) {
                    return true;
                }
            }) as CuttingLineClientStructure,

            virtualWalls: this.structureManager.getClientStructures().filter(s => {
                if (s.type === VirtualWallClientStructure.TYPE) {
                    return true;
                }
            }) as Array<VirtualWallClientStructure>,
            noGoAreas: this.structureManager.getClientStructures().filter(s => {
                if (s.type === NoGoAreaClientStructure.TYPE) {
                    return true;
                }
            }) as Array<NoGoAreaClientStructure>,
            noMopAreas: this.structureManager.getClientStructures().filter(s => {
                if (s.type === NoMopAreaClientStructure.TYPE) {
                    return true;
                }
            }) as Array<NoMopAreaClientStructure>,

            thresholds: this.structureManager.getClientStructures().filter(s => {
                if (s.type === ThresholdClientStructure.TYPE) {
                    return true;
                }
            }) as Array<ThresholdClientStructure>,

            curtains: this.structureManager.getClientStructures().filter(s => {
                if (s.type === CurtainClientStructure.TYPE) {
                    return true;
                }
            }) as Array<CurtainClientStructure>,

            ramps: this.structureManager.getClientStructures().filter(s => {
                if (s.type === RampClientStructure.TYPE) {
                    return true;
                }
            }) as Array<RampClientStructure>,

            mirrorZones: this.structureManager.getClientStructures().filter(s => {
                if (s.type === MirrorZoneClientStructure.TYPE) {
                    return true;
                }
            }) as Array<MirrorZoneClientStructure>,
        });
    }

    private updateVirtualRestrictionClientStructures(remove: boolean) : void {
        if (remove) {
            this.structureManager.getClientStructures().forEach(s => {
                switch (s.type) {
                    case VirtualWallClientStructure.TYPE:
                    case NoGoAreaClientStructure.TYPE:
                    case NoMopAreaClientStructure.TYPE:
                        this.structureManager.removeClientStructure(s);
                }
            });
        } else {
            this.props.rawMap.entities.forEach(e => {
                switch (e.type) {
                    case RawMapEntityType.VirtualWall: {
                        const p0 = this.structureManager.convertCMCoordinatesToPixelSpace({x: e.points[0], y: e.points[1]});
                        const p1 = this.structureManager.convertCMCoordinatesToPixelSpace({x: e.points[2], y: e.points[3]});

                        this.structureManager.addClientStructure(new VirtualWallClientStructure(
                            p0.x, p0.y,
                            p1.x, p1.y,
                            false
                        ));
                        break;
                    }
                    case RawMapEntityType.NoGoArea: {
                        const p0 = this.structureManager.convertCMCoordinatesToPixelSpace({x: e.points[0], y: e.points[1]});
                        const p1 = this.structureManager.convertCMCoordinatesToPixelSpace({x: e.points[2], y: e.points[3]});
                        const p2 = this.structureManager.convertCMCoordinatesToPixelSpace({x: e.points[4], y: e.points[5]});
                        const p3 = this.structureManager.convertCMCoordinatesToPixelSpace({x: e.points[6], y: e.points[7]});


                        this.structureManager.addClientStructure(new NoGoAreaClientStructure(
                            p0.x, p0.y,
                            p1.x, p1.y,
                            p2.x, p2.y,
                            p3.x, p3.y,
                            false
                        ));
                        break;
                    }
                    case RawMapEntityType.NoMopArea: {
                        const p0 = this.structureManager.convertCMCoordinatesToPixelSpace({x: e.points[0], y: e.points[1]});
                        const p1 = this.structureManager.convertCMCoordinatesToPixelSpace({x: e.points[2], y: e.points[3]});
                        const p2 = this.structureManager.convertCMCoordinatesToPixelSpace({x: e.points[4], y: e.points[5]});
                        const p3 = this.structureManager.convertCMCoordinatesToPixelSpace({x: e.points[6], y: e.points[7]});


                        this.structureManager.addClientStructure(new NoMopAreaClientStructure(
                            p0.x, p0.y,
                            p1.x, p1.y,
                            p2.x, p2.y,
                            p3.x, p3.y,
                            false
                        ));
                        break;
                    }

                }
            });
        }
    }

    private updateMapAnnotationsClientStructures(remove: boolean) : void {
        if (remove) {
            this.structureManager.getClientStructures().forEach(s => {
                switch (s.type) {
                    case ThresholdClientStructure.TYPE:
                        this.structureManager.removeClientStructure(s);
                        break;
                    case CurtainClientStructure.TYPE:
                        this.structureManager.removeClientStructure(s);
                        break;
                    case RampClientStructure.TYPE:
                        this.structureManager.removeClientStructure(s);
                        break;
                }
            });
        } else {
            this.props.rawMap.entities.forEach(e => {
                switch (e.type) {
                    case RawMapEntityType.Threshold: {
                        const p0 = this.structureManager.convertCMCoordinatesToPixelSpace({x: e.points[0], y: e.points[1]});
                        const p1 = this.structureManager.convertCMCoordinatesToPixelSpace({x: e.points[2], y: e.points[3]});

                        this.structureManager.addClientStructure(new ThresholdClientStructure(
                            p0.x, p0.y,
                            p1.x, p1.y,
                            false
                        ));
                        break;
                    }
                    case RawMapEntityType.Curtain: {
                        const p0 = this.structureManager.convertCMCoordinatesToPixelSpace({x: e.points[0], y: e.points[1]});
                        const p1 = this.structureManager.convertCMCoordinatesToPixelSpace({x: e.points[2], y: e.points[3]});

                        this.structureManager.addClientStructure(new CurtainClientStructure(
                            p0.x, p0.y,
                            p1.x, p1.y,
                            false
                        ));
                        break;
                    }
                    case RawMapEntityType.Ramp: {
                        const p0 = this.structureManager.convertCMCoordinatesToPixelSpace({x: e.points[0], y: e.points[1]});
                        const p1 = this.structureManager.convertCMCoordinatesToPixelSpace({x: e.points[2], y: e.points[3]});
                        const p2 = this.structureManager.convertCMCoordinatesToPixelSpace({x: e.points[4], y: e.points[5]});
                        const p3 = this.structureManager.convertCMCoordinatesToPixelSpace({x: e.points[6], y: e.points[7]});

                        this.structureManager.addClientStructure(new RampClientStructure(
                            p0.x, p0.y,
                            p1.x, p1.y,
                            p2.x, p2.y,
                            p3.x, p3.y,
                            false
                        ));
                        break;
                    }
                }
            });
        }
    }

    // Mota: quita las zonas de espejo del editor y, si se pasan, crea las indicadas
    private updateMirrorZoneClientStructures(zones: Array<MotaMirrorZone> | undefined) : void {
        this.structureManager.getClientStructures().forEach(s => {
            if (s.type === MirrorZoneClientStructure.TYPE) {
                this.structureManager.removeClientStructure(s);
            }
        });

        (zones ?? []).forEach(zone => {
            this.structureManager.addClientStructure(mirrorZoneToClientStructure(zone, false));
        });
    }

    private clearSegmentStructures() : void {
        this.structureManager.getMapStructures().forEach(s => {
            if (s.type === SegmentLabelMapStructure.TYPE) {
                const label = s as SegmentLabelMapStructure;

                label.selected = false;
            }
        });

        this.structureManager.getClientStructures().forEach(s => {
            if (s.type === CuttingLineClientStructure.TYPE) {
                this.structureManager.removeClientStructure(s);
            }
        });

        this.updateState();

        this.redrawLayers();
    }

    private getRetouchOverlay() : HTMLCanvasElement {
        if (this.retouchOverlay === undefined) {
            this.retouchOverlay = document.createElement("canvas");
        }

        if (this.retouchOverlay.width !== this.props.rawMap.size.x || this.retouchOverlay.height !== this.props.rawMap.size.y) {
            this.retouchOverlay.width = this.props.rawMap.size.x;
            this.retouchOverlay.height = this.props.rawMap.size.y;
        }

        return this.retouchOverlay;
    }

    private drawRetouchOverlay() : void {
        const overlay = this.getRetouchOverlay();
        const ctx = overlay.getContext("2d")!;
        const retouch = this.props.retouch;

        ctx.clearRect(0, 0, overlay.width, overlay.height);

        if (retouch !== undefined && this.state.retouchTool === "islands") {
            const paintIslands = (islands: MotaMapRetouchStatus["islands"], color: string) => {
                ctx.fillStyle = color;
                islands.forEach(island => {
                    island.cells.forEach(cell => {
                        ctx.fillRect(cell % retouch.width, Math.floor(cell / retouch.width), 1, 1);
                    });
                });
            };

            paintIslands(retouch.hidden, RETOUCH_COLORS.hidden);
            paintIslands(retouch.islands, RETOUCH_COLORS.island);
        }

        [...this.sentStrokes, ...(this.activeStroke ? [this.activeStroke] : [])].forEach(stroke => {
            ctx.fillStyle = RETOUCH_COLORS[stroke.value];
            forEachStrokeStamp(stroke.points, stroke.radius, (x, y, size) => {
                ctx.fillRect(x, y, size, size);
            });
        });
    }

    private canRetouch() : boolean {
        return this.props.mode === "retouch" && this.props.robotStatus.value === "docked" && this.props.retouch?.usable === true;
    }

    private getRetouchMapPoint(x: number, y: number) : {x: number, y: number} {
        const canvasPoint = this.relativeCoordinatesToCanvas(x, y);
        const mapPoint = this.ctxWrapper.mapPointToCurrentTransform(canvasPoint.x, canvasPoint.y);

        return {x: Math.floor(mapPoint.x), y: Math.floor(mapPoint.y)};
    }

    private addStrokePoint(x: number, y: number) : void {
        const stroke = this.activeStroke;

        if (stroke === undefined) {
            return;
        }

        const point = this.getRetouchMapPoint(x, y);

        if (stroke.points[stroke.points.length - 2] !== point.x || stroke.points[stroke.points.length - 1] !== point.y) {
            stroke.points.push(point.x, point.y);
            this.drawRetouchOverlay();
            this.draw();
        }
    }

    private finishStroke() : void {
        const stroke = this.activeStroke;

        if (stroke !== undefined) {
            this.activeStroke = undefined;
            this.sentStrokes.push(stroke);
            this.props.onRetouchAction?.({type: "paint", ...stroke});
        }
    }

    private startStroke() : void {
        const tool = this.state.retouchTool;

        if (tool !== "islands") {
            this.activeStroke = {value: tool, radius: this.state.retouchBrushRadius, points: []};
        }
    }

    private isBrushActive() : boolean {
        return this.canRetouch() && this.state.retouchTool !== "islands";
    }

    private tapIsland(x: number, y: number) : boolean {
        const retouch = this.props.retouch;

        if (retouch === undefined) {
            return false;
        }

        const point = this.getRetouchMapPoint(x, y);
        const tolerance = Math.max(1, Math.ceil(considerHiDPI(ISLAND_TAP_TOLERANCE) / this.currentScaleFactor));
        const isNear = (island: MotaMapRetouchStatus["islands"][number]) => {
            return island.cells.some(cell => {
                return (
                    Math.abs(cell % retouch.width - point.x) <= tolerance &&
                    Math.abs(Math.floor(cell / retouch.width) - point.y) <= tolerance
                );
            });
        };
        const island = retouch.islands.find(isNear);
        const hidden = island === undefined ? retouch.hidden.find(isNear) : undefined;

        if (island !== undefined) {
            this.props.onRetouchAction?.({type: "hide", ids: [island.id]});
        } else if (hidden !== undefined) {
            this.props.onRetouchAction?.({type: "show", ids: [hidden.id]});
        }

        return island !== undefined || hidden !== undefined;
    }

    protected startTranslate(evt: PanStartTouchHandlerEvent) : void {
        if (this.isBrushActive()) {
            this.activeTouchEvent = true;
            this.startStroke();
            this.addStrokePoint(evt.x0, evt.y0);
        } else {
            super.startTranslate(evt);
        }
    }

    protected moveTranslate(evt: PanMoveTouchHandlerEvent) : void {
        if (this.activeStroke !== undefined) {
            this.addStrokePoint(evt.x1, evt.y1);
        } else if (!this.isBrushActive()) {
            super.moveTranslate(evt);
        }
    }

    protected endTranslate(evt: PanEndTouchHandlerEvent | PinchEndTouchHandlerEvent) : void {
        this.finishStroke();

        super.endTranslate(evt);
    }

    protected startPinch(evt: PinchStartTouchHandlerEvent) : void {
        // Dos dedos son para mover el mapa: lo pintado con el primero no era un trazo
        this.activeStroke = undefined;
        this.drawRetouchOverlay();

        super.startPinch(evt);
    }

    componentDidUpdate(prevProps: Readonly<EditMapProps>, prevState: Readonly<EditMapState>): void {
        super.componentDidUpdate(prevProps, prevState);

        if (
            this.props.mode === "retouch" &&
            (prevProps.retouch !== this.props.retouch || prevState.retouchTool !== this.state.retouchTool)
        ) {
            this.drawRetouchOverlay();
            this.draw();
        }
    }

    protected onMapUpdate() : void {
        this.sentStrokes = [];

        if (this.pendingVirtualRestrictionsStructuresUpdate) {
            this.updateVirtualRestrictionClientStructures(true);
            this.updateVirtualRestrictionClientStructures(false);

            this.pendingVirtualRestrictionsStructuresUpdate = false;
        }

        if (this.pendingMapAnnotationsStructuresUpdate) {
            this.updateMapAnnotationsClientStructures(true);
            this.updateMapAnnotationsClientStructures(false);

            this.pendingMapAnnotationsStructuresUpdate = false;
        }
    }

    //eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    protected onTap(evt: any): boolean | void {
        // Only allow map interaction while the robot is docked
        if (this.props.robotStatus.value === "docked") {
            if (super.onTap(evt)) {
                return true;
            }

            if (this.canRetouch()) {
                if (this.state.retouchTool === "islands") {
                    return this.tapIsland(evt.x0, evt.y0);
                }

                this.startStroke();
                this.addStrokePoint(evt.x0, evt.y0);
                this.finishStroke();

                return true;
            }

            if (
                this.props.mode === "segments" &&
                this.state.cuttingLine === undefined
            ) {
                const {x, y} = this.relativeCoordinatesToCanvas(evt.x0, evt.y0);
                const tappedPointInMapSpace = this.ctxWrapper.mapPointToCurrentTransform(x, y);

                const intersectingSegmentId = this.mapLayerManager.getIntersectingSegment(tappedPointInMapSpace.x, tappedPointInMapSpace.y);

                if (intersectingSegmentId) {
                    const segmentLabels = this.structureManager.getMapStructures().filter(s => {
                        return s.type === SegmentLabelMapStructure.TYPE;
                    }) as Array<SegmentLabelMapStructure>;

                    const matchedSegmentLabel = segmentLabels.find(l => {
                        return l.id === intersectingSegmentId;
                    });

                    if (
                        this.state.selectedSegmentIds.length < 2 ||
                        this.state.selectedSegmentIds.includes(intersectingSegmentId)
                    ) {
                        if (matchedSegmentLabel) {
                            matchedSegmentLabel.onTap();

                            this.updateState();
                            this.redrawLayers();

                            return true;
                        }
                    }
                }
            }
        }
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

                <HelpAction
                    helpDialogOpen={this.state.helpDialogOpen}
                    setHelpDialogOpen={(open) => {
                        this.setState({helpDialogOpen: open});
                    }}
                />

                <ActionsContainer>
                    {
                        (
                            this.props.supportedCapabilities[Capability.MapSegmentEdit] ||
                            this.props.supportedCapabilities[Capability.MapSegmentRename]
                        ) &&
                        this.props.mode === "segments" &&

                        <SegmentActions
                            robotStatus={this.props.robotStatus}
                            selectedSegmentIds={this.state.selectedSegmentIds}
                            segmentNames={this.state.segmentNames}
                            segmentMaterials={this.state.segmentMaterials}
                            segmentColors={this.state.segmentColors}
                            motaApiAvailable={this.props.motaApiAvailable === true}
                            cuttingLine={this.state.cuttingLine}
                            convertPixelCoordinatesToCMSpace={(coordinates => {
                                return this.structureManager.convertPixelCoordinatesToCMSpace(coordinates);
                            })}
                            supportedCapabilities={{
                                [Capability.MapSegmentEdit]: this.props.supportedCapabilities[Capability.MapSegmentEdit],
                                [Capability.MapSegmentRename]: this.props.supportedCapabilities[Capability.MapSegmentRename],
                                [Capability.MapSegmentMaterialControl]: this.props.supportedCapabilities[Capability.MapSegmentMaterialControl]
                            }}
                            onAddCuttingLine={() => {
                                const currentCenter = this.getCurrentViewportCenterCoordinatesInPixelSpace();

                                const p0 = {
                                    x: currentCenter.x -15,
                                    y: currentCenter.y -15
                                };
                                const p1 = {
                                    x: currentCenter.x +15,
                                    y: currentCenter.y +15
                                };

                                this.structureManager.addClientStructure(new CuttingLineClientStructure(
                                    p0.x, p0.y,
                                    p1.x, p1.y,
                                    true
                                ));

                                this.updateState();

                                this.draw();
                            }}
                            onClear={() => {
                                this.clearSegmentStructures();
                            }}
                        />
                    }
                    {
                        this.props.motaApiAvailable === true &&
                        this.props.mode === "segments" &&
                        this.state.selectedSegmentIds.length === 0 &&
                        this.state.cuttingLine === undefined &&

                        <ResegmentAction
                            robotStatus={this.props.robotStatus}
                            onDone={() => {
                                this.clearSegmentStructures();
                            }}
                        />
                    }
                    {
                        (
                            this.props.supportedCapabilities[Capability.CombinedVirtualRestrictions]
                        ) &&
                        this.props.mode === "virtual_restrictions" &&

                        <VirtualRestrictionActions
                            robotStatus={this.props.robotStatus}
                            virtualWalls={this.state.virtualWalls}
                            noGoAreas={this.state.noGoAreas}
                            noMopAreas={this.state.noMopAreas}

                            convertPixelCoordinatesToCMSpace={(coordinates => {
                                return this.structureManager.convertPixelCoordinatesToCMSpace(coordinates);
                            })}

                            onAddVirtualWall={() => {
                                const currentCenter = this.getCurrentViewportCenterCoordinatesInPixelSpace();

                                const p0 = {
                                    x: currentCenter.x -15,
                                    y: currentCenter.y -15
                                };
                                const p1 = {
                                    x: currentCenter.x +15,
                                    y: currentCenter.y +15
                                };

                                this.structureManager.addClientStructure(new VirtualWallClientStructure(
                                    p0.x, p0.y,
                                    p1.x, p1.y,
                                    true
                                ));

                                this.updateState();

                                this.draw();
                            }}
                            onAddNoGoArea={() => {
                                const currentCenter = this.getCurrentViewportCenterCoordinatesInPixelSpace();

                                const p0 = {
                                    x: currentCenter.x -15,
                                    y: currentCenter.y -15
                                };
                                const p1 = {
                                    x: currentCenter.x +15,
                                    y: currentCenter.y -15
                                };
                                const p2 = {
                                    x: currentCenter.x +15,
                                    y: currentCenter.y +15
                                };
                                const p3 = {
                                    x: currentCenter.x -15,
                                    y: currentCenter.y +15
                                };


                                this.structureManager.addClientStructure(new NoGoAreaClientStructure(
                                    p0.x, p0.y,
                                    p1.x, p1.y,
                                    p2.x, p2.y,
                                    p3.x, p3.y,
                                    true
                                ));

                                this.updateState();

                                this.draw();
                            }}
                            onAddNoMopArea={() => {
                                const currentCenter = this.getCurrentViewportCenterCoordinatesInPixelSpace();

                                const p0 = {
                                    x: currentCenter.x -15,
                                    y: currentCenter.y -15
                                };
                                const p1 = {
                                    x: currentCenter.x +15,
                                    y: currentCenter.y -15
                                };
                                const p2 = {
                                    x: currentCenter.x +15,
                                    y: currentCenter.y +15
                                };
                                const p3 = {
                                    x: currentCenter.x -15,
                                    y: currentCenter.y +15
                                };

                                this.structureManager.addClientStructure(new NoMopAreaClientStructure(
                                    p0.x, p0.y,
                                    p1.x, p1.y,
                                    p2.x, p2.y,
                                    p3.x, p3.y,
                                    true
                                ));

                                this.updateState();

                                this.draw();
                            }}
                            onRefresh={() => {
                                this.updateVirtualRestrictionClientStructures(true);
                                this.updateVirtualRestrictionClientStructures(false);

                                this.updateState();
                                this.draw();
                            }}
                            onClear={() => {
                                this.updateVirtualRestrictionClientStructures(true);

                                this.updateState();
                                this.draw();
                            }}
                            onSave={() => {
                                this.pendingVirtualRestrictionsStructuresUpdate = true;

                                this.props.enqueueSnackbar(i18n.t("map.savedSuccessfully"), {
                                    preventDuplicate: true,
                                    key: "virtual_restrictions_saved",
                                    variant: "info",
                                    autoHideDuration: 1000,
                                });
                            }}
                        />
                    }
                    {
                        this.props.mode === "mirrors" &&

                        <MirrorActions
                            robotStatus={this.props.robotStatus}
                            mirrorZones={this.state.mirrorZones}
                            restrictedZonesSupported={this.props.supportedCapabilities[Capability.CombinedVirtualRestrictions]}

                            convertPixelCoordinatesToCMSpace={(coordinates => {
                                return this.structureManager.convertPixelCoordinatesToCMSpace(coordinates);
                            })}

                            onAddMirrorZone={() => {
                                const currentCenter = this.getCurrentViewportCenterCoordinatesInPixelSpace();

                                this.structureManager.addClientStructure(mirrorZoneToClientStructure({
                                    x0: Math.round(currentCenter.x - 15),
                                    y0: Math.round(currentCenter.y - 15),
                                    x1: Math.round(currentCenter.x + 15) - 1,
                                    y1: Math.round(currentCenter.y + 15) - 1
                                }, true));

                                this.updateState();

                                this.draw();
                            }}
                            onRefresh={(zones) => {
                                this.updateMirrorZoneClientStructures(zones);

                                this.updateState();
                                this.draw();
                            }}
                            onClear={() => {
                                this.updateMirrorZoneClientStructures(undefined);

                                this.updateState();
                                this.draw();
                            }}
                            onSave={() => {
                                this.props.enqueueSnackbar(i18n.t("map.savedSuccessfully"), {
                                    preventDuplicate: true,
                                    key: "mirror_zones_saved",
                                    variant: "info",
                                    autoHideDuration: 1000,
                                });
                            }}
                        />
                    }
                    {
                        this.props.mode === "retouch" &&

                        <RetouchActions
                            robotStatus={this.props.robotStatus}
                            retouch={this.props.retouch}
                            busy={this.props.retouchBusy === true}
                            tool={this.state.retouchTool}
                            brushRadius={this.state.retouchBrushRadius}
                            onToolChange={(tool) => {
                                this.setState({retouchTool: tool});
                            }}
                            onBrushRadiusChange={(radius) => {
                                this.setState({retouchBrushRadius: radius});
                            }}
                            onAction={(action) => {
                                this.props.onRetouchAction?.(action);
                            }}
                        />
                    }
                    {
                        (
                            this.props.supportedCapabilities[Capability.MapAnnotations]
                        ) &&
                        this.props.mode === "annotations" &&

                        <MapAnnotationActions
                            robotStatus={this.props.robotStatus}
                            thresholds={this.state.thresholds}
                            curtains={this.state.curtains}
                            ramps={this.state.ramps}

                            convertPixelCoordinatesToCMSpace={(coordinates => {
                                return this.structureManager.convertPixelCoordinatesToCMSpace(coordinates);
                            })}

                            onAddThreshold={() => {
                                const currentCenter = this.getCurrentViewportCenterCoordinatesInPixelSpace();

                                const p0 = {
                                    x: currentCenter.x -10,
                                    y: currentCenter.y -10
                                };
                                const p1 = {
                                    x: currentCenter.x +10,
                                    y: currentCenter.y +10
                                };

                                this.structureManager.addClientStructure(new ThresholdClientStructure(
                                    p0.x, p0.y,
                                    p1.x, p1.y,
                                    true
                                ));

                                this.updateState();

                                this.draw();
                            }}

                            onAddCurtain={() => {
                                const currentCenter = this.getCurrentViewportCenterCoordinatesInPixelSpace();

                                const p0 = {
                                    x: currentCenter.x -10,
                                    y: currentCenter.y -10
                                };
                                const p1 = {
                                    x: currentCenter.x +10,
                                    y: currentCenter.y +10
                                };

                                this.structureManager.addClientStructure(new CurtainClientStructure(
                                    p0.x, p0.y,
                                    p1.x, p1.y,
                                    true
                                ));

                                this.updateState();

                                this.draw();
                            }}

                            onAddRamp={() => {
                                const currentCenter = this.getCurrentViewportCenterCoordinatesInPixelSpace();

                                const p0 = {
                                    x: currentCenter.x -5,
                                    y: currentCenter.y -5
                                };
                                const p1 = {
                                    x: currentCenter.x +5,
                                    y: currentCenter.y -5
                                };
                                const p2 = {
                                    x: currentCenter.x +5,
                                    y: currentCenter.y +5
                                };
                                const p3 = {
                                    x: currentCenter.x -5,
                                    y: currentCenter.y +5
                                };

                                this.structureManager.addClientStructure(new RampClientStructure(
                                    p0.x, p0.y,
                                    p1.x, p1.y,
                                    p2.x, p2.y,
                                    p3.x, p3.y,
                                    true
                                ));

                                this.updateState();

                                this.draw();
                            }}

                            onRefresh={() => {
                                this.updateMapAnnotationsClientStructures(true);
                                this.updateMapAnnotationsClientStructures(false);

                                this.updateState();
                                this.draw();
                            }}
                            onClear={() => {
                                this.updateMapAnnotationsClientStructures(true);

                                this.updateState();
                                this.draw();
                            }}
                            onSave={() => {
                                this.pendingMapAnnotationsStructuresUpdate = true;

                                this.props.enqueueSnackbar(i18n.t("map.savedSuccessfully"), {
                                    preventDuplicate: true,
                                    key: "map_annotations_saved",
                                    variant: "info",
                                    autoHideDuration: 1000,
                                });
                            }}
                        />
                    }
                </ActionsContainer>

                <HelpDialog
                    dialogOpen={this.state.helpDialogOpen}
                    setDialogOpen={(open: boolean) => {
                        this.setState({helpDialogOpen: open});
                    }}
                    helpText={this.props.helpText}
                />
            </MapContainer>
        );
    }
}

export default EditMap;

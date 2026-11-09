import React from "react";
import {create} from "zustand";
import type {LiveMapMode} from "./LiveMap";

/**
 * Mota: puente entre el mapa en vivo (componente de clase) y el panel "Qué limpiar".
 *
 * - El mapa publica el modo en el que está y los modos que admite.
 * - El panel pide un cambio de modo con requestLiveMapMode(); el mapa lo aplica con su lógica de siempre.
 * - Las acciones del mapa (habitaciones, zonas, punto) publican su acción principal para que el botón
 *   grande del panel la pueda lanzar sin reimplementarla.
 * - El selector de la pantalla de inicio elige cómo se ve el recorrido: normal, cobertura u oculto.
 */
export interface LiveMapPrimaryAction {
    label: string;
    hasSelection: boolean;
    enabled: boolean;
    busy: boolean;
    run: () => void;
}

/**
 * La cobertura es el mismo recorrido con un trazo grueso debajo: por eso es un solo selector y no dos casillas
 */
export type LiveMapPathView = "path" | "coverage" | "hidden";

interface LiveMapControlState {
    mode: LiveMapMode;
    supportedModes: Array<LiveMapMode>;
    requestedMode: { mode: LiveMapMode, seq: number } | null;
    primaryAction: LiveMapPrimaryAction | null;
    pathView: LiveMapPathView;
}

const PATH_VIEW_LOCAL_STORAGE_KEY = "live-map-path-view";
// Antes solo se podía ocultar
const PATHS_HIDDEN_LOCAL_STORAGE_KEY = "live-map-paths-hidden";

const readPathView = (): LiveMapPathView => {
    try {
        const stored = window.localStorage.getItem(PATH_VIEW_LOCAL_STORAGE_KEY);

        if (stored === "path" || stored === "coverage" || stored === "hidden") {
            return stored;
        }

        return window.localStorage.getItem(PATHS_HIDDEN_LOCAL_STORAGE_KEY) === "true" ? "hidden" : "path";
    } catch (e) {
        return "path";
    }
};

export const useLiveMapControl = create<LiveMapControlState>()(() => {
    return {
        mode: "none",
        supportedModes: [],
        requestedMode: null,
        primaryAction: null,
        pathView: readPathView(),
    };
});

export const setLiveMapPathView = (pathView: LiveMapPathView): void => {
    useLiveMapControl.setState({pathView: pathView});

    try {
        window.localStorage.setItem(PATH_VIEW_LOCAL_STORAGE_KEY, pathView);
        window.localStorage.removeItem(PATHS_HIDDEN_LOCAL_STORAGE_KEY);
    } catch (e) {
        /* intentional */
    }
};

export const requestLiveMapMode = (mode: LiveMapMode): void => {
    const previous = useLiveMapControl.getState().requestedMode;

    useLiveMapControl.setState({
        requestedMode: {mode: mode, seq: (previous?.seq ?? 0) + 1}
    });
};

/**
 * Publica la acción principal de un panel de acciones del mapa mientras está montado
 *
 * @param {LiveMapPrimaryAction | null} action
 */
export const usePublishLiveMapPrimaryAction = (action: LiveMapPrimaryAction | null): void => {
    const label = action?.label;
    const hasSelection = action?.hasSelection;
    const enabled = action?.enabled;
    const busy = action?.busy;
    const run = action?.run;

    React.useEffect(() => {
        if (label === undefined || run === undefined) {
            useLiveMapControl.setState({primaryAction: null});

            return;
        }

        useLiveMapControl.setState({
            primaryAction: {
                label: label,
                hasSelection: hasSelection === true,
                enabled: enabled === true,
                busy: busy === true,
                run: run
            }
        });
    }, [label, hasSelection, enabled, busy, run]);

    React.useEffect(() => {
        return () => {
            useLiveMapControl.setState({primaryAction: null});
        };
    }, []);
};

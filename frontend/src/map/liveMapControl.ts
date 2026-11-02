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
 * - El botón de la pantalla de inicio oculta o muestra el recorrido.
 */
export interface LiveMapPrimaryAction {
    label: string;
    hasSelection: boolean;
    enabled: boolean;
    busy: boolean;
    run: () => void;
}

interface LiveMapControlState {
    mode: LiveMapMode;
    supportedModes: Array<LiveMapMode>;
    requestedMode: { mode: LiveMapMode, seq: number } | null;
    primaryAction: LiveMapPrimaryAction | null;
    pathsHidden: boolean;
}

const PATHS_HIDDEN_LOCAL_STORAGE_KEY = "live-map-paths-hidden";

const readPathsHidden = (): boolean => {
    try {
        return window.localStorage.getItem(PATHS_HIDDEN_LOCAL_STORAGE_KEY) === "true";
    } catch (e) {
        return false;
    }
};

export const useLiveMapControl = create<LiveMapControlState>()(() => {
    return {
        mode: "none",
        supportedModes: [],
        requestedMode: null,
        primaryAction: null,
        pathsHidden: readPathsHidden(),
    };
});

export const setLiveMapPathsHidden = (pathsHidden: boolean): void => {
    useLiveMapControl.setState({pathsHidden: pathsHidden});

    try {
        window.localStorage.setItem(PATHS_HIDDEN_LOCAL_STORAGE_KEY, String(pathsHidden));
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

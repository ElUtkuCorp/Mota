import {useMediaQuery} from "@mui/material";

// Mota: a partir de este ancho hay menú lateral fijo, mapa en el centro y panel de control a la derecha
export const DESKTOP_LAYOUT_MIN_WIDTH = 1024;
export const DESKTOP_DRAWER_WIDTH = 264;

export const useIsDesktopLayout = (): boolean => {
    return useMediaQuery(`(min-width:${DESKTOP_LAYOUT_MIN_WIDTH}px)`, {
        noSsr: true,
    });
};

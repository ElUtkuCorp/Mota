import {alpha, createTheme, PaletteMode, Shadows, Theme} from "@mui/material";

/**
 * Mota: sistema visual propio (fase 2.4). Todos los colores, tipografías, radios y estilos base de los
 * componentes salen de aquí, para que toda la interfaz cambie de forma coherente.
 */

export interface MotaTokens {
    /** Fondo de los controles secundarios (pistas de los segmentados, casillas sin marcar) */
    surfaceMuted: string;
    /** Acento suave (seleccionado) y el texto que va encima */
    accentSoft: string;
    accentSoftText: string;
    /** Botón oscuro (en el tema oscuro se invierte) */
    ink: string;
    inkText: string;
    inkHover: string;
    /** Aviso o batería baja */
    warnSoft: string;
    warnSoftText: string;
    /** Correcto */
    successSoft: string;
    successSoftText: string;
    /** Error */
    errorSoft: string;
    errorSoftText: string;
    /** Fondo del mapa dentro de su tarjeta */
    mapBackground: string;
}

declare module "@mui/material/styles" {
    interface Palette {
        mota: MotaTokens;
    }
    interface PaletteOptions {
        mota?: MotaTokens;
    }
}

export const TITLE_FONT_FAMILY = "\"Manrope\", \"Inter\", \"Helvetica\", sans-serif";
export const TEXT_FONT_FAMILY = "\"Inter\", \"Helvetica\", sans-serif";

export const CARD_RADIUS = 22;
export const CONTROL_RADIUS = 14;
export const TOUCH_TARGET = 44;

export {ROOM_PASTELS} from "./colors";

const LIGHT = {
    background: "#F4F6F5",
    paper: "#FFFFFF",
    text: "#17201E",
    textSecondary: "#5B6763",
    divider: "#D5DCD9",
    primary: "#0F766E",
    primaryHover: "#115E59",
    primaryLight: "#14958A",
    tokens: {
        surfaceMuted: "#EBEFED",
        accentSoft: "#DDF1EE",
        accentSoftText: "#0B5E57",
        ink: "#17201E",
        inkText: "#FFFFFF",
        inkHover: "#2A3532",
        warnSoft: "#FDEBD3",
        warnSoftText: "#92400E",
        successSoft: "#DDF1E4",
        successSoftText: "#166534",
        errorSoft: "#FBE1DF",
        errorSoftText: "#9F1D16",
        mapBackground: "#EEF2F0",
    } as MotaTokens,
};

// Misma estructura que el claro. Acento más luminoso: #2DD4BF sobre #18211E da 9,6:1 y el texto oscuro
// encima del botón (#0F1513 sobre #2DD4BF) 10:1, ambos por encima de AA
const DARK = {
    background: "#0F1513",
    paper: "#18211E",
    text: "#E8EEEC",
    textSecondary: "#A3B1AC",
    divider: "#2C3834",
    primary: "#2DD4BF",
    primaryHover: "#5EEAD4",
    primaryLight: "#5EEAD4",
    tokens: {
        surfaceMuted: "#222D29",
        accentSoft: "#123B36",
        accentSoftText: "#99F6E4",
        ink: "#E8EEEC",
        inkText: "#0F1513",
        inkHover: "#FFFFFF",
        warnSoft: "#3A2A12",
        warnSoftText: "#FCD34D",
        successSoft: "#12321F",
        successSoftText: "#86EFAC",
        errorSoft: "#3B1614",
        errorSoftText: "#FCA5A5",
        mapBackground: "#131B18",
    } as MotaTokens,
};

const buildShadows = (mode: PaletteMode): Shadows => {
    const c = mode === "light" ? "23, 32, 30" : "0, 0, 0";
    const soft = mode === "light" ? 0.05 : 0.35;
    const shadows: string[] = ["none"];

    for (let i = 1; i <= 24; i++) {
        if (i <= 4) {
            // Tarjetas: como mucho una sombra muy suave
            shadows.push(`0 1px 2px rgba(${c}, ${soft})`);
        } else if (i <= 12) {
            // Menús y desplegables
            shadows.push(`0 6px 20px rgba(${c}, ${soft * 2.4}), 0 1px 3px rgba(${c}, ${soft * 1.4})`);
        } else {
            // Diálogos
            shadows.push(`0 18px 48px rgba(${c}, ${soft * 3}), 0 2px 6px rgba(${c}, ${soft * 1.4})`);
        }
    }

    return shadows as Shadows;
};

export const createMotaTheme = (mode: PaletteMode, transitionDurations: Record<string, number>): Theme => {
    const c = mode === "light" ? LIGHT : DARK;
    const t = c.tokens;

    return createTheme({
        palette: {
            mode: mode,
            primary: {
                main: c.primary,
                dark: c.primaryHover,
                light: c.primaryLight,
                contrastText: mode === "light" ? "#FFFFFF" : "#0F1513",
            },
            secondary: {
                main: t.ink,
                contrastText: t.inkText,
            },
            warning: {
                main: mode === "light" ? "#B45309" : "#FBBF24",
            },
            error: {
                main: mode === "light" ? "#B42318" : "#F87171",
            },
            success: {
                main: mode === "light" ? "#15803D" : "#4ADE80",
            },
            background: {
                default: c.background,
                paper: c.paper,
            },
            text: {
                primary: c.text,
                secondary: c.textSecondary,
            },
            divider: c.divider,
            action: {
                hover: alpha(c.text, mode === "light" ? 0.05 : 0.08),
            },
            mota: t,
        },
        shape: {
            borderRadius: 12,
        },
        shadows: buildShadows(mode),
        typography: {
            fontFamily: TEXT_FONT_FAMILY,
            fontSize: 15,
            fontWeightRegular: 400,
            fontWeightMedium: 500,
            fontWeightBold: 600,
            h1: {fontFamily: TITLE_FONT_FAMILY, fontWeight: 800},
            h2: {fontFamily: TITLE_FONT_FAMILY, fontWeight: 800},
            h3: {fontFamily: TITLE_FONT_FAMILY, fontWeight: 800},
            h4: {fontFamily: TITLE_FONT_FAMILY, fontWeight: 800, letterSpacing: "-0.01em"},
            h5: {fontFamily: TITLE_FONT_FAMILY, fontWeight: 800, letterSpacing: "-0.01em"},
            h6: {fontFamily: TITLE_FONT_FAMILY, fontWeight: 700},
            subtitle1: {fontWeight: 600},
            subtitle2: {fontWeight: 600},
            button: {fontWeight: 600, textTransform: "none"},
            overline: {fontWeight: 600, letterSpacing: "0.06em"},
        },
        transitions: {
            duration: transitionDurations,
        },
        breakpoints: {
            values: {
                xs: 0,
                sm: 750,
                md: 900,
                lg: 1200,
                xl: 1536,
            },
        },
        components: {
            MuiCssBaseline: {
                styleOverrides: {
                    body: {
                        WebkitFontSmoothing: "antialiased",
                        MozOsxFontSmoothing: "grayscale",
                    },
                    "*": {
                        scrollbarWidth: "thin",
                    },
                },
            },
            MuiPaper: {
                styleOverrides: {
                    root: {
                        backgroundImage: "none",
                    },
                    rounded: {
                        borderRadius: CARD_RADIUS,
                    },
                    outlined: {
                        borderColor: c.divider,
                    },
                },
            },
            MuiCard: {
                defaultProps: {
                    elevation: 1,
                },
                styleOverrides: {
                    root: {
                        borderRadius: CARD_RADIUS,
                    },
                },
            },
            MuiCardContent: {
                styleOverrides: {
                    root: {
                        padding: 20,
                        "&:last-child": {
                            paddingBottom: 20,
                        },
                    },
                },
            },
            MuiMenu: {
                styleOverrides: {
                    paper: {
                        borderRadius: CONTROL_RADIUS,
                    },
                },
            },
            MuiPopover: {
                styleOverrides: {
                    paper: {
                        borderRadius: 16,
                    },
                },
            },
            MuiDialog: {
                styleOverrides: {
                    paper: {
                        borderRadius: CARD_RADIUS,
                    },
                    paperFullScreen: {
                        borderRadius: 0,
                    },
                },
            },
            MuiDialogTitle: {
                styleOverrides: {
                    root: {
                        fontFamily: TITLE_FONT_FAMILY,
                        fontWeight: 700,
                    },
                },
            },
            MuiAlert: {
                styleOverrides: {
                    root: {
                        borderRadius: CONTROL_RADIUS,
                    },
                },
            },
            MuiButton: {
                defaultProps: {
                    disableElevation: true,
                },
                styleOverrides: {
                    root: {
                        borderRadius: CONTROL_RADIUS,
                        minHeight: TOUCH_TARGET,
                        paddingLeft: 18,
                        paddingRight: 18,
                    },
                    sizeSmall: {
                        minHeight: 36,
                        borderRadius: 10,
                        paddingLeft: 12,
                        paddingRight: 12,
                    },
                    sizeLarge: {
                        minHeight: 52,
                        fontSize: "1rem",
                    },
                    outlined: {
                        borderColor: c.divider,
                    },
                },
            },
            MuiIconButton: {
                styleOverrides: {
                    sizeMedium: {
                        padding: 10,
                    },
                },
            },
            MuiFab: {
                styleOverrides: {
                    root: {
                        boxShadow: mode === "light" ? "0 2px 8px rgba(23, 32, 30, 0.12)" : "0 2px 8px rgba(0, 0, 0, 0.5)",
                        textTransform: "none",
                        fontWeight: 600,
                    },
                },
            },
            MuiToggleButtonGroup: {
                styleOverrides: {
                    root: {
                        backgroundColor: t.surfaceMuted,
                        borderRadius: CONTROL_RADIUS,
                        padding: 4,
                        gap: 4,
                    },
                    grouped: {
                        border: 0,
                        borderRadius: "10px !important",
                        margin: 0,
                    },
                },
            },
            MuiToggleButton: {
                styleOverrides: {
                    root: {
                        minHeight: 40,
                        textTransform: "none",
                        fontWeight: 600,
                        fontSize: "0.9rem",
                        color: c.textSecondary,
                        border: 0,
                        "&.Mui-selected": {
                            backgroundColor: c.paper,
                            color: c.text,
                            boxShadow: mode === "light" ? "0 1px 3px rgba(23, 32, 30, 0.12)" : "0 1px 3px rgba(0, 0, 0, 0.5)",
                            "&:hover": {
                                backgroundColor: c.paper,
                            },
                        },
                    },
                },
            },
            MuiChip: {
                styleOverrides: {
                    root: {
                        borderRadius: 999,
                        fontWeight: 600,
                    },
                },
            },
            MuiListItemButton: {
                styleOverrides: {
                    root: {
                        borderRadius: 12,
                        minHeight: TOUCH_TARGET,
                        "&.Mui-selected": {
                            backgroundColor: t.accentSoft,
                            color: t.accentSoftText,
                            "& .MuiListItemIcon-root": {
                                color: t.accentSoftText,
                            },
                            "&:hover": {
                                backgroundColor: t.accentSoft,
                            },
                        },
                    },
                },
            },
            MuiListItem: {
                styleOverrides: {
                    root: {
                        minHeight: TOUCH_TARGET,
                    },
                },
            },
            MuiListItemIcon: {
                styleOverrides: {
                    root: {
                        minWidth: 44,
                        color: c.textSecondary,
                    },
                },
            },
            MuiListSubheader: {
                styleOverrides: {
                    root: {
                        fontFamily: TITLE_FONT_FAMILY,
                        fontWeight: 700,
                        fontSize: "0.78rem",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: c.textSecondary,
                        lineHeight: "40px",
                    },
                },
            },
            MuiDivider: {
                styleOverrides: {
                    root: {
                        borderColor: c.divider,
                    },
                },
            },
            MuiAppBar: {
                defaultProps: {
                    elevation: 0,
                    color: "inherit",
                },
                styleOverrides: {
                    root: {
                        backgroundColor: c.background,
                        color: c.text,
                        borderBottom: `1px solid ${c.divider}`,
                    },
                },
            },
            MuiDrawer: {
                styleOverrides: {
                    paper: {
                        backgroundColor: c.paper,
                        borderRight: `1px solid ${c.divider}`,
                        "& .MuiListItemButton-root": {
                            marginLeft: 8,
                            marginRight: 8,
                        },
                    },
                },
            },
            MuiTooltip: {
                styleOverrides: {
                    tooltip: {
                        backgroundColor: t.ink,
                        color: t.inkText,
                        borderRadius: 8,
                        fontSize: "0.8rem",
                        fontWeight: 500,
                    },
                    arrow: {
                        color: t.ink,
                    },
                },
            },
            MuiOutlinedInput: {
                styleOverrides: {
                    root: {
                        borderRadius: 12,
                    },
                    notchedOutline: {
                        borderColor: c.divider,
                    },
                },
            },
            MuiLinearProgress: {
                styleOverrides: {
                    root: {
                        borderRadius: 999,
                    },
                    bar: {
                        borderRadius: 999,
                    },
                },
            },
            MuiAccordion: {
                styleOverrides: {
                    root: {
                        "&::before": {
                            display: "none",
                        },
                    },
                },
            },
            MuiAvatar: {
                styleOverrides: {
                    root: {
                        borderRadius: 14,
                    },
                    colorDefault: {
                        backgroundColor: t.accentSoft,
                        color: t.accentSoftText,
                    },
                },
            },
            MuiSkeleton: {
                styleOverrides: {
                    rounded: {
                        borderRadius: CARD_RADIUS,
                    },
                },
            },
        },
    });
};

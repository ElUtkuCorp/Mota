import React from "react";
import {createTheme, CssBaseline, PaletteMode, ThemeProvider, useMediaQuery} from "@mui/material";
import {createMotaTheme} from "./theme";
import RouterChoice from "./RouterChoice";
import CapabilitiesProvider from "./CapabilitiesProvider";
import {SnackbarProvider} from "notistack";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {ReactQueryDevtools} from "@tanstack/react-query-devtools";
import {useLocalStorage} from "./hooks";
// Mota: tipografías empaquetadas en local (el robot no tiene Internet). Solo el subconjunto latino
// y los pesos que se usan: Inter 400-600 para el texto y Manrope 700/800 para títulos y números
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/manrope/latin-700.css";
import "@fontsource/manrope/latin-800.css";
import "@fontsource/jetbrains-mono/latin-200.css";

const ANIMATION_SPEED = 2;
const queryClient = new QueryClient();

const App = (): React.ReactElement => {
    const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
    const [paletteMode, setPaletteMode] = useLocalStorage<PaletteMode>("palette-mode", prefersDarkMode ? "dark" : "light");

    const theme = React.useMemo(
        () => {
            const defaultTheme = createTheme();
            const transitionDurations: any = {};
            Object.entries(defaultTheme.transitions.duration).forEach(([key, value]) => {
                transitionDurations[key] = Math.round(value / ANIMATION_SPEED);
            });

            return createMotaTheme(paletteMode, transitionDurations);
        },
        [paletteMode]
    );

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <CssBaseline/>

                <SnackbarProvider maxSnack={3} autoHideDuration={5000}>
                    <CapabilitiesProvider>
                        <RouterChoice paletteMode={paletteMode} setPaletteMode={setPaletteMode}/>
                    </CapabilitiesProvider>
                </SnackbarProvider>
            </ThemeProvider>

            <ReactQueryDevtools initialIsOpen={false} buttonPosition={"bottom-left"}/>
        </QueryClientProvider>
    );
};

export default App;

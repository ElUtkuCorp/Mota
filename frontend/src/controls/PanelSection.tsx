import {Box, Paper, SxProps, Theme, Typography} from "@mui/material";
import React from "react";
import {TITLE_FONT_FAMILY} from "../theme";

// Mota: título de sección dentro de las tarjetas del panel ("Qué limpiar", "Potencia"…)
export const PanelSectionTitle: React.FunctionComponent<{
    id?: string,
    trailing?: React.ReactNode,
    children: React.ReactNode
}> = ({
    id,
    trailing,
    children
}): React.ReactElement => {
    return (
        <Box sx={{display: "flex", alignItems: "center", gap: 1, mb: 1, minHeight: 24}}>
            <Typography
                id={id}
                component="h2"
                sx={{
                    fontFamily: TITLE_FONT_FAMILY,
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    lineHeight: 1.3,
                }}
            >
                {children}
            </Typography>
            {trailing && <Box sx={{display: "inline-flex", ml: "auto"}}>{trailing}</Box>}
        </Box>
    );
};

// Mota: tarjeta del panel de control (fondo de tarjeta, radio 22 y sin sombra marcada)
export const PanelCard: React.FunctionComponent<{
    sx?: SxProps<Theme>,
    children: React.ReactNode
}> = ({
    sx,
    children
}): React.ReactElement => {
    return (
        <Paper
            elevation={1}
            sx={[
                {p: {xs: 1.75, sm: 2.25}},
                ...(Array.isArray(sx) ? sx : [sx])
            ]}
        >
            {children}
        </Paper>
    );
};

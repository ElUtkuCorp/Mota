import React from "react";
import { Box } from "@mui/material";
import ReloadableCard from "../../components/ReloadableCard";

// Mota: las tarjetas ocupan todo el ancho disponible, sin columnas vacías si hay pocas
export const CapabilityContainer: React.FunctionComponent<{ children: React.ReactNode }> = ({ children }): React.ReactElement => {
    return (
        <Box sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
            gap: 2,
            alignItems: "start",
        }}>
            {children}
        </Box>
    );
};

export const CapabilityItem: React.FunctionComponent<{
    children: React.ReactNode,
    title: string,
    loading?: boolean,
    onReload?: () => void,
    helpText?: string
}> = ({
    children,
    title,
    onReload,
    loading = false,
    helpText
}): React.ReactElement => {
    return (
        <Box sx={{ width: "100%" }}>
            <ReloadableCard
                title={title}
                onReload={onReload}
                loading={loading}
                boxShadow={3}
                helpText={helpText}
            >
                {children}
            </ReloadableCard>
        </Box>
    );
};

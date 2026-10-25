import {Box, Skeleton, SvgIconProps} from "@mui/material";
import React, {ReactNode} from "react";
import LoadingFade from "../components/LoadingFade";
import {PanelCard, PanelSectionTitle} from "./PanelSection";


interface ControlsCardProps {
    icon: React.ComponentType<SvgIconProps>;
    title: string;
    pending?: boolean;
    children: ReactNode;
    isLoading?: boolean
}

// Mota: misma tarjeta que el resto del panel de Inicio (2.4)
const ControlsCard: React.FC<ControlsCardProps> = ({ icon: Icon, title, pending = false, children, isLoading }) => (
    <PanelCard>
        <PanelSectionTitle
            trailing={
                <LoadingFade
                    in={pending}
                    transitionDelay={pending ? "500ms" : "0ms"}
                    size={20}
                />
            }
        >
            <Box component="span" sx={{display: "inline-flex", alignItems: "center", gap: 1}}>
                <Icon fontSize="small" sx={{color: "text.secondary"}}/>
                {title}
            </Box>
        </PanelSectionTitle>
        <Box>
            {
                isLoading ? (
                    <Skeleton height="4rem" />
                ) : (
                    children
                )
            }
        </Box>
    </PanelCard>
);

export default ControlsCard;

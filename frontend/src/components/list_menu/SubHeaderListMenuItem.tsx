import React from "react";
import { ListItem, ListItemIcon, ListItemText } from "@mui/material";
import {TITLE_FONT_FAMILY} from "../../theme";

interface SubHeaderListMenuItemProps {
    primaryLabel: string;
    icon?: React.ReactElement;
}

export const SubHeaderListMenuItem = ({
    primaryLabel,
    icon
}: SubHeaderListMenuItemProps): React.ReactElement => {
    return (
        <ListItem>
            {icon && (
                <ListItemIcon sx={{ minWidth: "auto", mr: 2 }}>
                    {icon}
                </ListItemIcon>
            )}
            <ListItemText
                primary={primaryLabel}
                primaryTypographyProps={{
                    variant: "subtitle1",
                    fontFamily: TITLE_FONT_FAMILY,
                    fontWeight: 700,
                    fontSize: "1.05rem"
                }}
                sx={{marginTop: "0.2rem"}}
            />
        </ListItem>
    );
};

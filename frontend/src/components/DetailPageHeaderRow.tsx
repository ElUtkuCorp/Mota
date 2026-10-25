import {Button, Divider, Grid2, IconButton, styled, Typography} from "@mui/material";
import React, {FunctionComponent} from "react";
import {
    Help as HelpIcon,
    Refresh as RefreshIcon,
} from "@mui/icons-material";
import HelpDialog from "./HelpDialog";
import {useTranslation} from "react-i18next";
import {TITLE_FONT_FAMILY} from "../theme";

const TopRightRefreshButton = styled(Button)(({theme}) => {
    return {
        minWidth: 0
    };
});

interface DetailPageHeaderRowProps {
    title: string;
    icon: React.ReactElement;
    helpText?: string,
    onRefreshClick?: () => void,
    isRefreshing?: boolean
}

const DetailPageHeaderRow: FunctionComponent<DetailPageHeaderRowProps> = ({
    title,
    icon,
    helpText,
    onRefreshClick,
    isRefreshing
}): React.ReactElement => {
    const {t} = useTranslation();
    const [helpDialogOpen, setHelpDialogOpen] = React.useState(false);

    return (
        <>
            <Grid2 container alignItems="center" spacing={1} justifyContent="space-between">
                <Grid2 style={{display:"flex"}}>
                    <Grid2 style={{paddingRight: "8px", display: "flex", alignItems: "center"}} sx={{color: "text.secondary"}}>
                        {icon}
                    </Grid2>
                    <Grid2>
                        <Typography sx={{fontFamily: TITLE_FONT_FAMILY, fontWeight: 700, fontSize: "1.05rem"}}>{title}</Typography>
                    </Grid2>
                </Grid2>
                <Grid2>
                    <Grid2 container>
                        {
                            helpText !== undefined &&
                            <>
                                <Grid2
                                    style={{marginTop:"-0.125rem"}} //:(
                                >
                                    <IconButton
                                        onClick={() => {
                                            return setHelpDialogOpen(true);
                                        }}
                                        title={t("common.help")}
                                    >
                                        <HelpIcon/>
                                    </IconButton>
                                </Grid2>

                                <HelpDialog
                                    dialogOpen={helpDialogOpen}
                                    setDialogOpen={(open: boolean) => {
                                        setHelpDialogOpen(open);
                                    }}
                                    helpText={helpText}
                                />
                            </>
                        }

                        {
                            onRefreshClick !== undefined &&
                            <Grid2>
                                <TopRightRefreshButton
                                    loading={isRefreshing ?? false}
                                    onClick={onRefreshClick}
                                    title={t("common.refresh")}
                                >
                                    <RefreshIcon/>
                                </TopRightRefreshButton>
                            </Grid2>
                        }
                    </Grid2>
                </Grid2>
            </Grid2>
            <Divider sx={{mt: 1}}/>
        </>
    );
};

export default DetailPageHeaderRow;

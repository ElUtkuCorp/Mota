import PaperContainer from "../components/PaperContainer";
import {Box, Grid2} from "@mui/material";
import {Help as HelpIcon} from "@mui/icons-material";
import React from "react";
import ReactMarkdown from "react-markdown";
import gfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import style from "./Help.module.css";
import {useTranslation} from "react-i18next";
import DetailPageHeaderRow from "../components/DetailPageHeaderRow";

// Taken from stackoverflow: https://stackoverflow.com/a/69120400
function LinkRenderer(props: any) {
    return (
        <a href={props.href} target="_blank" rel="noreferrer">
            {props.children}
        </a>
    );
}

const Help = (): React.ReactElement => {
    const {t} = useTranslation();

    return (
        <PaperContainer>
            <Grid2 container direction="row">
                <Box style={{width: "100%"}}>
                    <DetailPageHeaderRow
                        title={t("nav.generalHelp")}
                        icon={<HelpIcon/>}
                    />

                    <div className={style.reactMarkDown}>
                        <ReactMarkdown
                            components={{ a: LinkRenderer}}
                            remarkPlugins={[gfm]}
                            rehypePlugins={[rehypeRaw]}
                        >
                            {t("help.general")}
                        </ReactMarkdown>
                    </div>
                </Box>
            </Grid2>
        </PaperContainer>
    );
};

export default Help;

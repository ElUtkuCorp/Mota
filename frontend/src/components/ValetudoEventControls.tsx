import React, { FunctionComponent } from "react";
import { Button, ButtonGroup, Stack, styled, Typography } from "@mui/material";
import { ConsumableSubType, ConsumableType, ValetudoEvent, ValetudoEventInteraction } from "../api";
import {formatDateTime, formatRelative, getConsumableName} from "../utils";
import {Trans, useTranslation} from "react-i18next";

export interface ValetudoEventRenderProps {
    event: ValetudoEvent;

    interact(interaction: ValetudoEventInteraction): void;
}

const EventRow = styled("div")({
    flex: "1",
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    overflow: "auto",
    marginTop: 2,
    marginBottom: 2,
});

const EventTimestamp : FunctionComponent<{timestamp: number | string}> = ({timestamp}) => {
    return (
        <Typography variant="caption" title={formatDateTime(new Date(timestamp))} style={{ cursor: "help" }}>
            {formatRelative(timestamp)}
        </Typography>
    );
};

const ConsumableDepletedEventControl: FunctionComponent<ValetudoEventRenderProps> =
    ({event, interact}) => {
        const {t} = useTranslation();
        const color = event.processed ? "textSecondary" : "textPrimary";
        const textStyle = event.processed ? {textDecoration: "line-through"} : {};

        if (!event.type || !event.subType) {
            return (
                <Typography color={"error"}>
                    {t("components.events.consumableWithoutType")}
                </Typography>
            );
        }

        return (
            <EventRow>
                <Stack>
                    <EventTimestamp timestamp={event.timestamp}/>
                    <Typography color={color} style={textStyle} sx={{mr: 1}}>
                        <Trans
                            i18nKey="components.events.consumableDepleted"
                            values={{name: getConsumableName(event.type as ConsumableType, event.subType as ConsumableSubType)}}
                            components={{em: <em/>}}
                        />
                    </Typography>
                </Stack>
                <Button
                    size="small"
                    variant={"contained"}
                    disabled={event.processed}
                    onClick={() => {
                        interact({
                            interaction: "reset"
                        });
                    }}
                    color="warning"
                >
                    {t("common.reset")}
                </Button>
            </EventRow>
        );
    };

const ErrorEventControl: FunctionComponent<ValetudoEventRenderProps> =
    ({event, interact}) => {
        const {t} = useTranslation();
        const color = event.processed ? "textSecondary" : "error";
        const textStyle = event.processed ? {textDecoration: "line-through"} : {};

        return (
            <EventRow>
                <Stack>
                    <EventTimestamp timestamp={event.timestamp}/>
                    <Typography color={color} style={textStyle} sx={{mr: 1}}>
                        {t("components.events.errorOccurred", {message: event.message || t("components.events.unknownError")})}
                    </Typography>
                </Stack>
                <Button
                    size="small"
                    variant={"contained"}
                    disabled={event.processed}
                    onClick={() => {
                        interact({
                            interaction: "ok"
                        });
                    }}
                    color="error"
                >
                    {t("components.events.dismiss")}
                </Button>
            </EventRow>
        );
    };

const PendingMapChangeEventControl: FunctionComponent<ValetudoEventRenderProps> =
    ({event, interact}) => {
        const {t} = useTranslation();
        const color = event.processed ? "textSecondary" : "textPrimary";
        const textStyle = event.processed ? {textDecoration: "line-through"} : {};

        return (
            <EventRow>
                <Stack>
                    <EventTimestamp timestamp={event.timestamp}/>
                    <Typography color={color} style={textStyle} sx={{mr: 1}}>
                        {t("components.events.pendingMapChange")}
                    </Typography>
                </Stack>
                <ButtonGroup size="small" variant="contained" color="success">
                    <Button
                        disabled={event.processed}
                        onClick={() => {
                            interact({
                                interaction: "yes"
                            });
                        }}
                        color="success"
                    >
                        {t("common.yes")}
                    </Button>
                    <Button
                        disabled={event.processed}
                        onClick={() => {
                            interact({
                                interaction: "no"
                            });
                        }}
                        color="error"
                    >
                        {t("common.no")}
                    </Button>
                </ButtonGroup>
            </EventRow>
        );
    };

// Mota: aviso del guardián del mapa (el mapa nuevo se parece poco al de referencia)
const MotaMapChangedEventControl: FunctionComponent<ValetudoEventRenderProps> =
    ({event, interact}) => {
        const {t} = useTranslation();
        const color = event.processed ? "textSecondary" : "textPrimary";
        const textStyle = event.processed ? {textDecoration: "line-through"} : {};
        const metaData = event.metaData ?? {};

        return (
            <EventRow>
                <Stack>
                    <EventTimestamp timestamp={event.timestamp}/>
                    <Typography color={color} style={textStyle} sx={{mr: 1}}>
                        {t("components.events.motaMapChanged", {
                            similarity: metaData.similarity ?? "?",
                            threshold: metaData.threshold ?? "?"
                        })}
                    </Typography>
                    {
                        metaData.referenceCells !== undefined && metaData.currentCells !== undefined &&
                        <Typography variant="caption" color="textSecondary" style={textStyle}>
                            {t("components.events.motaMapChangedCells", {
                                referenceCells: metaData.referenceCells,
                                currentCells: metaData.currentCells
                            })}
                        </Typography>
                    }
                </Stack>
                <ButtonGroup size="small" variant="contained" color="success">
                    <Button
                        disabled={event.processed}
                        onClick={() => {
                            interact({
                                interaction: "yes"
                            });
                        }}
                        color="success"
                    >
                        {t("components.events.motaMapChangedAccept")}
                    </Button>
                    <Button
                        disabled={event.processed}
                        onClick={() => {
                            interact({
                                interaction: "no"
                            });
                        }}
                        color="warning"
                    >
                        {t("components.events.motaMapChangedKeep")}
                    </Button>
                </ButtonGroup>
            </EventRow>
        );
    };

const CreateDismissableEventControl =(messageKey: string) : FunctionComponent<ValetudoEventRenderProps> => {
    return function DismissableEventControl({event, interact}) {
        const {t} = useTranslation();
        const color = event.processed ? "textSecondary" : "textPrimary";
        const textStyle = event.processed ? {textDecoration: "line-through"} : {};

        return (
            <EventRow>
                <Stack>
                    <EventTimestamp timestamp={event.timestamp}/>
                    <Typography color={color} style={textStyle} sx={{mr: 1}}>
                        {t(messageKey)}
                    </Typography>
                </Stack>
                <Button
                    size="small"
                    variant={"contained"}
                    disabled={event.processed}
                    onClick={() => {
                        interact({
                            interaction: "ok"
                        });
                    }}
                    color="info"
                >
                    {t("components.events.dismiss")}
                </Button>
            </EventRow>
        );
    };
};

const MissingResourceEventControl: FunctionComponent<ValetudoEventRenderProps> =
    ({event, interact}) => {
        const {t} = useTranslation();
        const color = event.processed ? "textSecondary" : "textPrimary";
        const textStyle = event.processed ? {textDecoration: "line-through"} : {};

        return (
            <EventRow>
                <Stack>
                    <EventTimestamp timestamp={event.timestamp}/>
                    <Typography color={color} style={textStyle} sx={{mr: 1}}>
                        {event.message!}
                    </Typography>
                </Stack>
                <Button
                    size="small"
                    variant={"contained"}
                    disabled={event.processed}
                    onClick={() => {
                        interact({
                            interaction: "ok"
                        });
                    }}
                    color="warning"
                >
                    {t("components.events.dismiss")}
                </Button>
            </EventRow>
        );
    };

const ValetudoUpdatedEventControl: FunctionComponent<ValetudoEventRenderProps> =
    ({event, interact}) => {
        const {t} = useTranslation();
        const color = event.processed ? "textSecondary" : "textPrimary";
        const textStyle = event.processed ? {textDecoration: "line-through"} : {};

        return (
            <EventRow>
                <Stack>
                    <EventTimestamp timestamp={event.timestamp}/>
                    <Typography color={color} style={textStyle} sx={{mr: 1}}>
                        {t("components.events.updated", {
                            previousVersion: event.previousVersion ?? t("common.unknown"),
                            newVersion: event.newVersion ?? t("common.unknown")
                        })}
                    </Typography>
                </Stack>
                <Button
                    size="small"
                    variant={"contained"}
                    disabled={event.processed}
                    onClick={() => {
                        interact({
                            interaction: "ok"
                        });
                    }}
                    color="info"
                >
                    {t("components.events.dismiss")}
                </Button>
            </EventRow>
        );
    };

const ValetudoRuntimeErrorEventControl: FunctionComponent<ValetudoEventRenderProps> =
    ({event, interact}) => {
        const {t} = useTranslation();
        const color = event.processed ? "textSecondary" : "error";
        const textStyle = event.processed ? {textDecoration: "line-through"} : {};

        return (
            <EventRow>
                <Stack>
                    <EventTimestamp timestamp={event.timestamp}/>
                    <Typography color={color} style={textStyle} sx={{mr: 1}}>
                        {t("components.events.runtimeError")}<br/><br/>
                        {event.description ? event.description: t("components.events.runtimeErrorReason", {reason: event.reason})}
                    </Typography>
                </Stack>
                <Button
                    size="small"
                    variant={"contained"}
                    disabled={event.processed}
                    onClick={() => {
                        interact({
                            interaction: "ok"
                        });
                    }}
                    color="error"
                >
                    {t("components.events.dismiss")}
                </Button>
            </EventRow>
        );
    };

const UnknownEventControl: FunctionComponent<ValetudoEventRenderProps> =
    ({event}) => {
        const {t} = useTranslation();

        return (
            <Typography color={"error"}>
                {t("components.events.unknownType", {type: event.__class})}
            </Typography>
        );
    };

export const eventControls: Record<string, React.ComponentType<ValetudoEventRenderProps>> = {
    ConsumableDepletedValetudoEvent: ConsumableDepletedEventControl,
    ErrorStateValetudoEvent: ErrorEventControl,
    PendingMapChangeValetudoEvent: PendingMapChangeEventControl,
    MotaMapChangedValetudoEvent: MotaMapChangedEventControl,
    DustBinFullValetudoEvent: CreateDismissableEventControl("components.events.dustBinFull"),
    MopAttachmentReminderValetudoEvent: CreateDismissableEventControl("components.events.mopAttached"),
    MissingResourceValetudoEvent: MissingResourceEventControl,
    ValetudoUpdatedValetudoEvent: ValetudoUpdatedEventControl,
    ValetudoRuntimeErrorValetudoEvent: ValetudoRuntimeErrorEventControl,
    Default: UnknownEventControl,
};

import {
    Button,
    FormControl,
    InputAdornment,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import {
    DeleteOutline as DeleteIcon,
    Download as DownloadIcon,
    FilterAlt as FilterAltIcon,
    Refresh as RefreshIcon,
} from "@mui/icons-material";
import React from "react";
import styles from "./Log.module.css";
import {
    LogLevel,
    LogLine,
    useLogLevelMutation,
    useLogLevelQuery,
    useValetudoLogDeleteMutation,
    useValetudoLogQuery,
} from "../api";
import LogViewer from "../components/LogViewer";
import PaperContainer from "../components/PaperContainer";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {useTranslation} from "react-i18next";

/**
 * Mota: página de registros. Los filtros (nivel mínimo, texto y fechas) se aplican aquí, en el navegador; antes el
 * selector de nivel cambiaba lo que el servidor guardaba y parecía un filtro que no funcionaba. Lo que se registra
 * se puede cambiar abajo, aparte.
 */

const LEVEL_ORDER: Array<LogLevel> = [LogLevel.trace, LogLevel.debug, LogLevel.info, LogLevel.warn, LogLevel.error];

// noinspection RegExpRedundantEscape
const LOGLINE_REGEX = /^\[(?<timestamp>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z)\] \[(?<level>[A-Z]+)\] (?<content>.*)$/;

const parseLog = (logData: string | undefined): Array<LogLine> => {
    const processedLog: Array<LogLine> = [];

    if (!logData) {
        return processedLog;
    }

    logData.split("\n").forEach(line => {
        const match = LOGLINE_REGEX.exec(line);

        if (match && match.groups) {
            processedLog.push({
                timestamp: new Date(match.groups.timestamp),
                level: match.groups.level.toLowerCase() as LogLevel,
                content: match.groups.content
            });
        } else if (processedLog[processedLog.length - 1] && line.length > 0) {
            processedLog[processedLog.length - 1].content += "\n" + line;
        }
    });

    return processedLog;
};

// "2026-10-25T17:43" (hora local, como el valor de <input type="datetime-local">) → Date
const parseLocalDateTime = (value: string): Date | undefined => {
    if (!value) {
        return undefined;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? undefined : date;
};

const Log = (): React.ReactElement => {
    const {t} = useTranslation();
    const [filter, setFilter] = React.useState("");
    const [minLevel, setMinLevel] = React.useState<LogLevel>(LogLevel.trace);
    const [from, setFrom] = React.useState("");
    const [to, setTo] = React.useState("");
    const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

    const {
        data: logData,
        isFetching: logDataFetching,
        isError: logError,
        refetch: logRefetch,
    } = useValetudoLogQuery();

    const {
        data: logLevel,
        refetch: logLevelRefetch
    } = useLogLevelQuery();

    const {mutate: mutateLogLevel} = useLogLevelMutation();
    const {mutate: deleteLog, isPending: deletePending} = useValetudoLogDeleteMutation();

    const processedLog = React.useMemo(() => {
        return parseLog(logData);
    }, [logData]);

    const filteredLog = React.useMemo(() => {
        const lowerFilter = filter.trim().toLowerCase();
        const minLevelIndex = LEVEL_ORDER.indexOf(minLevel);
        const fromDate = parseLocalDateTime(from);
        const toDate = parseLocalDateTime(to);

        return processedLog.filter(line => {
            const levelIndex = LEVEL_ORDER.indexOf(line.level);

            if (levelIndex >= 0 && levelIndex < minLevelIndex) {
                return false;
            }
            if (fromDate && line.timestamp < fromDate) {
                return false;
            }
            // El "hasta" incluye todo ese minuto
            if (toDate && line.timestamp.getTime() >= toDate.getTime() + 60_000) {
                return false;
            }

            return lowerFilter.length === 0 || line.content.toLowerCase().includes(lowerFilter);
        });
    }, [processedLog, filter, minLevel, from, to]);

    const refresh = () => {
        logLevelRefetch().catch(err => {
            // eslint-disable-next-line no-console
            console.error(err);
        });
        logRefetch().catch(err => {
            // eslint-disable-next-line no-console
            console.error(err);
        });
    };

    const download = () => {
        const text = filteredLog.map(line => {
            return `[${line.timestamp.toISOString()}] [${line.level.toUpperCase()}] ${line.content}`;
        }).join("\n") + "\n";
        const url = URL.createObjectURL(new Blob([text], {type: "text/plain;charset=utf-8"}));
        const link = document.createElement("a");

        link.href = url;
        link.download = `mota-registro-${new Date().toISOString().replace(/[:.]/g, "-")}.log`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    if (logError) {
        return (
            <PaperContainer>
                <Typography color="error">{t("log.loadError")}</Typography>
            </PaperContainer>
        );
    }

    return (
        <PaperContainer>
            <Stack spacing={2} sx={{width: "100%"}}>
                <Stack direction={{xs: "column", md: "row"}} spacing={1.5} sx={{userSelect: "none"}}>
                    <TextField
                        size="small"
                        sx={{flexGrow: 1}}
                        placeholder={t("log.filter")}
                        value={filter}
                        onChange={(e) => {
                            setFilter(e.target.value);
                        }}
                        slotProps={{
                            htmlInput: {"aria-label": t("log.filterLabel")},
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <FilterAltIcon/>
                                    </InputAdornment>
                                )
                            }
                        }}
                    />
                    <FormControl size="small" sx={{minWidth: 170}}>
                        <InputLabel id="log-min-level">{t("log.minLevel")}</InputLabel>
                        <Select
                            labelId="log-min-level"
                            value={minLevel}
                            label={t("log.minLevel")}
                            onChange={(e) => {
                                setMinLevel(e.target.value as LogLevel);
                            }}
                        >
                            {LEVEL_ORDER.map(level => {
                                return <MenuItem key={level} value={level}>{t(`log.levels.${level}`)}</MenuItem>;
                            })}
                        </Select>
                    </FormControl>
                </Stack>

                <Stack direction={{xs: "column", sm: "row"}} spacing={1.5} alignItems={{xs: "stretch", sm: "center"}}>
                    <TextField
                        size="small"
                        type="datetime-local"
                        label={t("log.from")}
                        value={from}
                        onChange={(e) => {
                            setFrom(e.target.value);
                        }}
                        slotProps={{inputLabel: {shrink: true}}}
                    />
                    <TextField
                        size="small"
                        type="datetime-local"
                        label={t("log.to")}
                        value={to}
                        onChange={(e) => {
                            setTo(e.target.value);
                        }}
                        slotProps={{inputLabel: {shrink: true}}}
                    />
                    {
                        (from || to) &&
                        <Button
                            size="small"
                            onClick={() => {
                                setFrom("");
                                setTo("");
                            }}
                        >
                            {t("log.clearDates")}
                        </Button>
                    }
                    <Stack direction="row" spacing={1} sx={{ml: {sm: "auto"}}}>
                        <Button
                            loading={logDataFetching}
                            onClick={refresh}
                            title={t("common.refresh")}
                            startIcon={<RefreshIcon/>}
                        >
                            {t("common.refresh")}
                        </Button>
                        <Button onClick={download} startIcon={<DownloadIcon/>} disabled={filteredLog.length === 0}>
                            {t("log.download")}
                        </Button>
                        <Button
                            color="error"
                            onClick={() => {
                                setDeleteDialogOpen(true);
                            }}
                            startIcon={<DeleteIcon/>}
                            disabled={deletePending}
                        >
                            {t("log.delete")}
                        </Button>
                    </Stack>
                </Stack>

                <Typography variant="caption" color="text.secondary">
                    {t("log.count", {shown: filteredLog.length, total: processedLog.length})}
                </Typography>

                <LogViewer
                    className={styles.logViewer}
                    style={{
                        width: "100%"
                    }}
                    logLines={filteredLog}
                />

                <Stack direction={{xs: "column", sm: "row"}} spacing={1.5} alignItems={{xs: "stretch", sm: "center"}}>
                    <FormControl size="small" sx={{minWidth: 220}}>
                        <InputLabel id="log-level-selector">{t("log.serverLevel")}</InputLabel>
                        <Select
                            labelId="log-level-selector"
                            value={logLevel?.current || "info"}
                            label={t("log.serverLevel")}
                            onChange={(e) => {
                                mutateLogLevel({
                                    level: e.target.value as LogLevel
                                });
                            }}
                        >
                            {logLevel?.presets.map(preset => {
                                return <MenuItem key={preset} value={preset}>{t(`log.levels.${preset}`, {defaultValue: preset})}</MenuItem>;
                            })}
                        </Select>
                    </FormControl>
                    <Typography variant="caption" color="text.secondary">
                        {t("log.serverLevelHelp")}
                    </Typography>
                </Stack>
            </Stack>

            <ConfirmationDialog
                title={t("log.deleteConfirmTitle")}
                text={t("log.deleteConfirmText")}
                open={deleteDialogOpen}
                onClose={() => {
                    setDeleteDialogOpen(false);
                }}
                onAccept={() => {
                    deleteLog(undefined, {
                        onSuccess: () => {
                            refresh();
                        }
                    });
                }}
            />
        </PaperContainer>
    );
};

export default Log;

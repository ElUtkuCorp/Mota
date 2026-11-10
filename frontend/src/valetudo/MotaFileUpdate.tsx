import React from "react";
import {
    Alert,
    Box,
    Button,
    Checkbox,
    FormControlLabel,
    IconButton,
    LinearProgress,
    Paper,
    Skeleton,
    Stack,
    Typography,
} from "@mui/material";
import {ContentCopy as CopyIcon} from "@mui/icons-material";
import {useTranslation} from "react-i18next";
import {
    pollMotaFileUpdate,
    MotaFileUpdateAction,
    MotaFileUpdateLast,
    MotaFileUpdateStatus,
    useMotaFileUpdateApplyMutation,
    useMotaFileUpdateDiscardMutation,
    useMotaFileUpdateQuery,
    useMotaFileUpdateRollbackMutation,
    useMotaFileUpdateUploadMutation,
} from "../api";
import {getApiErrorMessage, getApiErrorStatus} from "../api/utils";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {DISPLAY_LOCALE, formatNumber} from "../i18n";

/**
 * Mota: actualizar desde un archivo subido desde el navegador (el robot no tiene Internet). Mota conserva la versión
 * actual como anterior, se reinicia con la nueva y, si la web no vuelve a tiempo, vuelve sola a la anterior.
 * Solo existe en el robot: en otro sitio la API responde 404 y la sección no se muestra.
 */

const POLL_INTERVAL_MS = 3_000;
// Una petición colgada durante el reinicio no debe parar el sondeo
const POLL_TIMEOUT_MS = 5_000;
const MONO_FONT = "\"JetBrains Mono\",monospace";

const useFormatMegabytes = (): ((bytes: number) => string) => {
    const {t} = useTranslation();

    return React.useCallback((bytes: number) => {
        return t("fileUpdate.megabytes", {
            value: formatNumber(bytes / (1024 * 1024), {minimumFractionDigits: 1, maximumFractionDigits: 1})
        });
    }, [t]);
};

const formatUnixTime = (seconds: number): string => {
    return new Date(seconds * 1000).toLocaleString(DISPLAY_LOCALE, {dateStyle: "medium", timeStyle: "medium"});
};

const formatIsoTime = (iso: string): string => {
    const date = new Date(iso);

    if (Number.isNaN(date.getTime())) {
        return iso;
    }

    return date.toLocaleString(DISPLAY_LOCALE, {dateStyle: "medium", timeStyle: "medium"});
};

// La web del robot va por HTTP, donde el navegador no ofrece navigator.clipboard: se usa el método antiguo
const copyText = async (text: string): Promise<boolean> => {
    if (window.isSecureContext && navigator.clipboard) {
        try {
            await navigator.clipboard.writeText(text);

            return true;
        } catch {
            // se prueba el método antiguo
        }
    }

    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.select();

    let copied = false;
    try {
        copied = document.execCommand("copy");
    } catch {
        copied = false;
    }
    document.body.removeChild(textArea);

    return copied;
};

const HashLine: React.FunctionComponent<{ label: string, value: string }> = ({label, value}): React.ReactElement => {
    const {t} = useTranslation();
    const [copied, setCopied] = React.useState(false);

    return (
        <Box>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
                <Typography
                    variant="body2"
                    sx={{fontFamily: MONO_FONT, wordBreak: "break-all", userSelect: "all", flexGrow: 1}}
                >
                    {value}
                </Typography>
                <IconButton
                    size="small"
                    title={copied ? t("fileUpdate.copied") : t("fileUpdate.copy")}
                    aria-label={t("fileUpdate.copy")}
                    onClick={() => {
                        copyText(value).then(setCopied).catch(() => {
                            setCopied(false);
                        });
                    }}
                >
                    <CopyIcon fontSize="small" color={copied ? "success" : "inherit"}/>
                </IconButton>
            </Stack>
        </Box>
    );
};

const LastResult: React.FunctionComponent<{ last: MotaFileUpdateLast }> = ({last}): React.ReactElement | null => {
    const {t} = useTranslation();

    if (last.result === "running") {
        return null;
    }

    const severity = last.result === "ok" ? "success" : last.result === "rolled_back" ? "warning" : "error";

    return (
        <Alert severity={severity}>
            {t(`fileUpdate.last.${last.action}.${last.result}`, {time: formatUnixTime(last.at)})}
            {last.message && (
                <>
                    <br/>
                    {t("fileUpdate.last.message", {
                        message: t(`fileUpdate.last.step.${last.message}`, {defaultValue: last.message})
                    })}
                </>
            )}
        </Alert>
    );
};

// Espera mientras Mota se reinicia: sondea el estado (los fallos de red son normales mientras tanto) hasta que la
// operación termine o se acabe el tiempo, y entonces recarga la página.
const UpdateWaiting: React.FunctionComponent<{
    action: MotaFileUpdateAction,
    previousStartedAt: number | null,
    waitSeconds: number
}> = ({action, previousStartedAt, waitSeconds}): React.ReactElement => {
    const {t} = useTranslation();
    const limitSeconds = waitSeconds * 2 + 30;
    const [elapsed, setElapsed] = React.useState(0);
    const [reloading, setReloading] = React.useState(false);
    const [late, setLate] = React.useState(false);

    React.useEffect(() => {
        const startedAt = Date.now();
        let finished = false;
        let polling = false;

        const finish = () => {
            if (finished) {
                return;
            }
            finished = true;
            setReloading(true);
            window.location.reload();
        };

        const tick = window.setInterval(() => {
            const seconds = Math.floor((Date.now() - startedAt) / 1000);
            setElapsed(seconds);

            // Pasado el límite no se recarga a ciegas: si Mota aún no escucha, el navegador mostraría su página de
            // error. Se sigue sondeando y se recarga en cuanto responda
            if (seconds >= limitSeconds) {
                setLate(true);
            }
        }, 1_000);

        const poll = window.setInterval(() => {
            if (polling || finished) {
                return;
            }
            polling = true;

            pollMotaFileUpdate(POLL_TIMEOUT_MS).then(status => {
                const last = status.last;
                const done = last && last.startedAt !== previousStartedAt && last.result !== "running";

                if (done || (Date.now() - startedAt) / 1000 >= limitSeconds) {
                    finish();
                }
            }).catch(() => {
                // Mota se está reiniciando
            }).finally(() => {
                polling = false;
            });
        }, POLL_INTERVAL_MS);

        return () => {
            finished = true;
            window.clearInterval(tick);
            window.clearInterval(poll);
        };
    }, [limitSeconds, previousStartedAt]);

    return (
        <Stack spacing={1.5}>
            <Alert severity="info">
                {t(`fileUpdate.waiting.${action}`, {seconds: waitSeconds})}
            </Alert>
            <LinearProgress
                variant="determinate"
                value={Math.min(100, elapsed / limitSeconds * 100)}
            />
            {late && !reloading && (
                <Alert
                    severity="warning"
                    action={
                        <Button
                            color="inherit"
                            size="small"
                            onClick={() => {
                                window.location.reload();
                            }}
                        >
                            {t("fileUpdate.waiting.reload")}
                        </Button>
                    }
                >
                    {t("fileUpdate.waiting.late")}
                </Alert>
            )}
            <Typography variant="body2" color="text.secondary">
                {reloading ?
                    t("fileUpdate.waiting.reloading") :
                    t("fileUpdate.waiting.elapsed", {elapsed: elapsed, limit: limitSeconds})
                }
            </Typography>
        </Stack>
    );
};

const UploadedFile: React.FunctionComponent<{
    status: MotaFileUpdateStatus,
    busy: boolean,
    onInstall: (sha256: string) => void
}> = ({status, busy, onInstall}): React.ReactElement | null => {
    const {t} = useTranslation();
    const formatMegabytes = useFormatMegabytes();
    const [verified, setVerified] = React.useState(false);
    const [confirmOpen, setConfirmOpen] = React.useState(false);
    const {mutate: discard, isPending: discardPending} = useMotaFileUpdateDiscardMutation();
    const uploaded = status.uploaded;

    // Un archivo nuevo obliga a volver a comprobarlo
    const sha256 = uploaded?.sha256;
    React.useEffect(() => {
        setVerified(false);
    }, [sha256]);

    if (!uploaded) {
        return null;
    }

    const {afterBytes, reserveBytes} = status.space;
    const enoughSpace = afterBytes !== null && afterBytes >= reserveBytes;

    let blockedReason: string | null = null;
    if (status.running || status.uploading) {
        blockedReason = t("fileUpdate.blocked.busy");
    } else if (!status.docked) {
        blockedReason = t("fileUpdate.blocked.notDocked");
    } else if (!enoughSpace) {
        blockedReason = t("fileUpdate.blocked.space");
    }

    return (
        <Paper elevation={1} sx={{p: 1.5}}>
            <Stack spacing={1.25}>
                <Typography sx={{fontWeight: 600}}>{t("fileUpdate.uploaded.title")}</Typography>
                <Typography variant="body2">
                    {t("fileUpdate.uploaded.size", {
                        size: formatMegabytes(uploaded.size),
                        bytes: formatNumber(uploaded.size)
                    })}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {t("fileUpdate.uploaded.at", {time: formatIsoTime(uploaded.uploadedAt)})}
                </Typography>
                <HashLine label={t("fileUpdate.uploaded.sha256")} value={uploaded.sha256}/>
                <HashLine label={t("fileUpdate.uploaded.md5")} value={uploaded.md5}/>
                <Alert severity="warning">{t("fileUpdate.uploaded.compare")}</Alert>
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={verified}
                            onChange={(e) => {
                                setVerified(e.target.checked);
                            }}
                        />
                    }
                    label={t("fileUpdate.uploaded.verified")}
                />
                <Typography variant="body2" color={enoughSpace ? "text.secondary" : "error"}>
                    {afterBytes === null ?
                        t("fileUpdate.space.unknown", {reserve: formatMegabytes(reserveBytes)}) :
                        t("fileUpdate.space.after", {
                            after: formatMegabytes(Math.max(0, afterBytes)),
                            reserve: formatMegabytes(reserveBytes)
                        })
                    }
                </Typography>
                {/* Fuera de la base el aviso ya sale arriba */}
                {blockedReason && status.docked && (
                    <Alert severity="error">{blockedReason}</Alert>
                )}
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button
                        variant="contained"
                        disabled={!verified || blockedReason !== null || discardPending || busy}
                        onClick={() => {
                            setConfirmOpen(true);
                        }}
                    >
                        {t("fileUpdate.install")}
                    </Button>
                    <Button
                        color="error"
                        loading={discardPending}
                        disabled={status.running || status.uploading}
                        onClick={() => {
                            discard();
                        }}
                    >
                        {t("fileUpdate.discard")}
                    </Button>
                </Stack>
            </Stack>

            <ConfirmationDialog
                title={t("fileUpdate.installConfirmTitle")}
                text={t("fileUpdate.installConfirmText", {seconds: status.waitSeconds})}
                open={confirmOpen}
                onClose={() => {
                    setConfirmOpen(false);
                }}
                onAccept={() => {
                    onInstall(uploaded.sha256);
                }}
            />
        </Paper>
    );
};

const FileUpload: React.FunctionComponent<{ status: MotaFileUpdateStatus }> = ({status}): React.ReactElement => {
    const {t} = useTranslation();
    const formatMegabytes = useFormatMegabytes();
    const {mutate: upload, isPending, error, reset} = useMotaFileUpdateUploadMutation();
    const [progress, setProgress] = React.useState<{ loaded: number, total: number } | null>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = React.useState<string | null>(null);
    const abortRef = React.useRef<AbortController | null>(null);

    React.useEffect(() => {
        return () => {
            abortRef.current?.abort();
        };
    }, []);

    const startUpload = (file: File) => {
        const controller = new AbortController();

        abortRef.current?.abort();
        abortRef.current = controller;
        reset();
        setFileName(file.name);
        setProgress({loaded: 0, total: file.size});

        upload({
            file: file,
            signal: controller.signal,
            onProgress: (loaded, total) => {
                setProgress({loaded: loaded, total: total});
            }
        }, {
            onSettled: () => {
                if (abortRef.current === controller) {
                    abortRef.current = null;
                }
                setProgress(null);
            }
        });
    };

    const cancelled = error !== null && (error as {code?: string}).code === "ERR_CANCELED";

    return (
        <Stack spacing={1.25}>
            <Box>
                <Button
                    variant="outlined"
                    disabled={isPending || status.uploading || status.running}
                    onClick={() => {
                        inputRef.current?.click();
                    }}
                >
                    {status.uploaded ? t("fileUpdate.chooseAnother") : t("fileUpdate.choose")}
                </Button>
                <input
                    ref={inputRef}
                    type="file"
                    hidden
                    onChange={(e) => {
                        const file = e.target.files?.[0];

                        // Para poder elegir otra vez el mismo archivo
                        e.target.value = "";
                        if (file) {
                            startUpload(file);
                        }
                    }}
                />
            </Box>
            {isPending && progress && (
                <Stack spacing={0.75}>
                    <Typography variant="body2">
                        {t("fileUpdate.uploading", {
                            name: fileName ?? "",
                            loaded: formatMegabytes(progress.loaded),
                            total: formatMegabytes(progress.total)
                        })}
                    </Typography>
                    <LinearProgress
                        variant="determinate"
                        value={progress.total > 0 ? Math.min(100, progress.loaded / progress.total * 100) : 0}
                    />
                    <Box>
                        <Button
                            size="small"
                            onClick={() => {
                                abortRef.current?.abort();
                            }}
                        >
                            {t("fileUpdate.cancelUpload")}
                        </Button>
                    </Box>
                </Stack>
            )}
            {!isPending && status.uploading && (
                <Alert severity="info">{t("fileUpdate.uploadingElsewhere")}</Alert>
            )}
            {error !== null && !cancelled && (
                <Alert
                    severity="error"
                    onClose={() => {
                        reset();
                    }}
                >
                    {t("fileUpdate.uploadError", {message: getApiErrorMessage(error)})}
                </Alert>
            )}
        </Stack>
    );
};

const PreviousVersion: React.FunctionComponent<{
    status: MotaFileUpdateStatus,
    busy: boolean,
    onRollback: () => void
}> = ({status, busy, onRollback}): React.ReactElement | null => {
    const {t} = useTranslation();
    const formatMegabytes = useFormatMegabytes();
    const [confirmOpen, setConfirmOpen] = React.useState(false);
    const previous = status.previous;

    if (!previous) {
        return null;
    }

    let blockedReason: string | null = null;
    if (status.running || status.uploading) {
        blockedReason = t("fileUpdate.blocked.busy");
    } else if (!status.docked) {
        blockedReason = t("fileUpdate.blocked.notDocked");
    }

    return (
        <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{fontWeight: 600}}>{t("fileUpdate.previous.title")}</Typography>
            <Typography variant="body2">
                {previous.release !== null ?
                    t("fileUpdate.previous.version", {
                        release: previous.release,
                        commit: previous.commit ?? t("fileUpdate.unknownVersion"),
                        size: formatMegabytes(previous.size)
                    }) :
                    t("fileUpdate.previous.versionUnknown", {
                        time: formatIsoTime(previous.modifiedAt),
                        size: formatMegabytes(previous.size)
                    })
                }
            </Typography>
            {blockedReason && status.docked && (
                <Typography variant="body2" color="text.secondary">{blockedReason}</Typography>
            )}
            <Box>
                <Button
                    variant="outlined"
                    color="warning"
                    disabled={blockedReason !== null || busy}
                    onClick={() => {
                        setConfirmOpen(true);
                    }}
                >
                    {t("fileUpdate.previous.rollback")}
                </Button>
            </Box>

            <ConfirmationDialog
                title={t("fileUpdate.previous.confirmTitle")}
                text={t("fileUpdate.previous.confirmText", {seconds: status.waitSeconds})}
                open={confirmOpen}
                onClose={() => {
                    setConfirmOpen(false);
                }}
                onAccept={onRollback}
            />
        </Stack>
    );
};

const MotaFileUpdate = (): React.ReactElement | null => {
    const {t} = useTranslation();
    const formatMegabytes = useFormatMegabytes();
    const {data: status, isPending, isError, error} = useMotaFileUpdateQuery();
    const {mutate: apply, isPending: applyPending} = useMotaFileUpdateApplyMutation();
    const {mutate: rollback, isPending: rollbackPending} = useMotaFileUpdateRollbackMutation();
    const [waiting, setWaiting] = React.useState<{
        action: MotaFileUpdateAction,
        previousStartedAt: number | null,
        waitSeconds: number
    } | null>(null);

    // Fuera del robot no existe la API
    if (isError && getApiErrorStatus(error) === 404) {
        return null;
    }

    let body: React.ReactElement;
    if (waiting) {
        body = (
            <UpdateWaiting
                action={waiting.action}
                previousStartedAt={waiting.previousStartedAt}
                waitSeconds={waiting.waitSeconds}
            />
        );
    } else if (isPending) {
        body = <Skeleton height={"8rem"}/>;
    } else if (!status || (isError && !applyPending && !rollbackPending)) {
        body = <Alert severity="error">{t("fileUpdate.loadError", {message: getApiErrorMessage(error)})}</Alert>;
    } else {
        const previousStartedAt = status.last?.startedAt ?? null;

        body = (
            <Stack spacing={2}>
                <Typography variant="body2">
                    {t("fileUpdate.current", {
                        release: status.current.release,
                        commit: status.current.commit,
                        size: status.current.size !== null ? formatMegabytes(status.current.size) : t("common.unknown")
                    })}
                </Typography>
                {status.last && <LastResult last={status.last}/>}
                {status.running && (
                    <Stack spacing={0.75}>
                        <Alert severity="info">{t("fileUpdate.running")}</Alert>
                        <LinearProgress/>
                    </Stack>
                )}
                {!status.docked && !status.running && (
                    <Alert severity="info">{t("fileUpdate.blocked.notDocked")}</Alert>
                )}
                {(applyPending || rollbackPending) && <LinearProgress/>}
                <FileUpload status={status}/>
                <UploadedFile
                    status={status}
                    busy={applyPending || rollbackPending}
                    onInstall={(sha256) => {
                        apply(sha256, {
                            onSuccess: (result) => {
                                setWaiting({
                                    action: "apply",
                                    previousStartedAt: previousStartedAt,
                                    waitSeconds: result.waitSeconds
                                });
                            }
                        });
                    }}
                />
                <PreviousVersion
                    status={status}
                    busy={applyPending || rollbackPending}
                    onRollback={() => {
                        rollback(undefined, {
                            onSuccess: (result) => {
                                setWaiting({
                                    action: "rollback",
                                    previousStartedAt: previousStartedAt,
                                    waitSeconds: result.waitSeconds
                                });
                            }
                        });
                    }}
                />
            </Stack>
        );
    }

    return (
        <Box sx={{mt: 2}}>
            <Stack spacing={2}>
                <Typography variant="h6">{t("fileUpdate.title")}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{whiteSpace: "pre-wrap"}}>
                    {t("fileUpdate.explanation")}
                </Typography>
                {body}
            </Stack>
        </Box>
    );
};

export default MotaFileUpdate;

import React from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    Paper,
    Stack,
    Typography,
} from "@mui/material";
import {useTranslation} from "react-i18next";
import {
    MotaFirmwareOrder,
    useMotaFirmwareOrderDeleteMutation,
    useMotaFirmwareOrdersQuery,
} from "../../api";
import {getApiErrorMessage, getApiErrorStatus} from "../../api/utils";
import ConfirmationDialog from "../../components/ConfirmationDialog";

/**
 * Mota: programaciones guardadas en el firmware (las crea la app del fabricante). Son independientes de las de Mota
 * y pueden lanzar limpiezas sin que Mota lo sepa. Solo se ven y se borran. En el robot simulado no existe la API
 * y la sección no se muestra.
 */

const MINUTES_PER_DAY = 24 * 60;
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;

// Índice = día de la semana de JavaScript (0 = domingo)
const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
// Orden en pantalla: de lunes a domingo
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

interface LocalSchedule {
    minutes: number;
    days: Array<number>;
}

// Pasa cada entrada (día y hora UTC) a la hora del navegador, que puede caer en otro día, y agrupa los días por hora
const toLocalSchedules = (order: MotaFirmwareOrder): Array<LocalSchedule> => {
    const offset = new Date().getTimezoneOffset(); // UTC - local, en minutos
    const byTime = new Map<number, Set<number>>();

    for (const entry of order.utc) {
        const utcTotal = entry.dow * MINUTES_PER_DAY + entry.hour * 60 + entry.minute;
        const localTotal = (((utcTotal - offset) % MINUTES_PER_WEEK) + MINUTES_PER_WEEK) % MINUTES_PER_WEEK;
        const day = Math.floor(localTotal / MINUTES_PER_DAY);
        const minutes = localTotal % MINUTES_PER_DAY;

        const days = byTime.get(minutes) ?? new Set<number>();
        days.add(day);
        byTime.set(minutes, days);
    }

    return [...byTime.entries()]
        .map(([minutes, days]) => {
            return {
                minutes: minutes,
                days: DISPLAY_ORDER.filter(day => {
                    return days.has(day);
                })
            };
        })
        .sort((a, b) => {
            return a.minutes - b.minutes;
        });
};

const formatTime = (minutes: number): string => {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;

    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

const OrderRow: React.FunctionComponent<{
    order: MotaFirmwareOrder,
    busy: boolean,
    onDelete: () => void
}> = ({order, busy, onDelete}): React.ReactElement => {
    const {t} = useTranslation();
    const schedules = toLocalSchedules(order);

    const describeDays = (days: Array<number>): string => {
        if (days.length === 7) {
            return t("firmwareOrders.everyDay");
        }

        return days.map(day => {
            return t(`timers.weekdaysShort.${DAY_KEYS[day]}`);
        }).join(", ");
    };

    return (
        <Paper elevation={1} sx={{p: 1.5}}>
            <Stack spacing={1}>
                <Box>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Typography sx={{fontWeight: 600}}>
                            {t("firmwareOrders.orderTitle", {id: order.id})}
                        </Typography>
                        {!order.enabled && (
                            <Chip size="small" variant="outlined" label={t("firmwareOrders.disabled")}/>
                        )}
                        {!order.repeat && (
                            <Chip size="small" variant="outlined" label={t("firmwareOrders.once")}/>
                        )}
                        {order.twice && (
                            <Chip size="small" variant="outlined" label={t("firmwareOrders.twice")}/>
                        )}
                    </Stack>
                    {schedules.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                            {t("firmwareOrders.noDays", {time: formatTime(order.firmwareTime.hour * 60 + order.firmwareTime.minute)})}
                        </Typography>
                    ) : (
                        schedules.map(schedule => {
                            return (
                                <Typography
                                    key={schedule.minutes}
                                    variant="body2"
                                    color={order.enabled ? "text.primary" : "text.secondary"}
                                >
                                    {t("firmwareOrders.schedule", {
                                        days: describeDays(schedule.days),
                                        time: formatTime(schedule.minutes)
                                    })}
                                </Typography>
                            );
                        })
                    )}
                </Box>
                <Box>
                    <Button size="small" color="error" disabled={busy} onClick={onDelete}>
                        {t("firmwareOrders.delete")}
                    </Button>
                </Box>
            </Stack>
        </Paper>
    );
};

const FirmwareOrders = (): React.ReactElement | null => {
    const {t} = useTranslation();
    const {data, isPending, isError, error} = useMotaFirmwareOrdersQuery();
    const {mutate: deleteOrder, isPending: deletePending} = useMotaFirmwareOrderDeleteMutation();
    const [toDelete, setToDelete] = React.useState<MotaFirmwareOrder | null>(null);
    const [stillListed, setStillListed] = React.useState<number | null>(null);

    // Fuera del robot no existe la API
    if (isError && getApiErrorStatus(error) === 404) {
        return null;
    }

    let body: React.ReactElement;
    if (isPending) {
        body = <CircularProgress size={24} sx={{alignSelf: "center"}}/>;
    } else if (isError || !data) {
        body = (
            <Alert severity="error">
                {t("firmwareOrders.loadError", {message: getApiErrorMessage(error)})}
            </Alert>
        );
    } else if (data.length === 0) {
        body = <Typography color="text.secondary">{t("firmwareOrders.empty")}</Typography>;
    } else {
        body = (
            <Stack spacing={1.25}>
                {data.map(order => {
                    return (
                        <OrderRow
                            key={order.id}
                            order={order}
                            busy={deletePending}
                            onDelete={() => {
                                setToDelete(order);
                            }}
                        />
                    );
                })}
            </Stack>
        );
    }

    return (
        <Box sx={{mt: 4}}>
            <Divider sx={{mb: 2}}/>
            <Stack spacing={2}>
                <Typography variant="h6">{t("firmwareOrders.title")}</Typography>
                <Typography variant="body2" color="text.secondary">
                    {t("firmwareOrders.explanation")}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {t("firmwareOrders.localTimeHint")}
                </Typography>
                <Alert severity="info">{t("firmwareOrders.rebootNote")}</Alert>
                {stillListed !== null && (
                    <Alert
                        severity="warning"
                        onClose={() => {
                            setStillListed(null);
                        }}
                    >
                        {t("firmwareOrders.stillListed", {id: stillListed})}
                    </Alert>
                )}
                {body}
            </Stack>

            <ConfirmationDialog
                title={t("firmwareOrders.deleteConfirmTitle")}
                text={toDelete ? t("firmwareOrders.deleteConfirmText", {id: toDelete.id}) : ""}
                open={toDelete !== null}
                onClose={() => {
                    setToDelete(null);
                }}
                onAccept={() => {
                    if (toDelete) {
                        const id = toDelete.id;

                        setStillListed(null);
                        deleteOrder(id, {
                            onSuccess: (result) => {
                                if (!result.removed) {
                                    setStillListed(id);
                                }
                            }
                        });
                    }
                }}
            />
        </Box>
    );
};

export default FirmwareOrders;

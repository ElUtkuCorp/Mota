import {
    Grid2,
    LinearProgress,
    linearProgressClasses,
    styled,
    Typography,
} from "@mui/material";
import React from "react";
import {
    RobotAttributeClass,
    useRobotAttributeQuery,
    useRobotStatusQuery,
} from "../api";
import {RobotMonochromeIcon} from "../components/CustomIcons";
import ControlsCard from "./ControlsCard";
import {useValetudoColorsInverse} from "../hooks/useValetudoColors";
import {useTranslation} from "react-i18next";

const BatteryProgress = styled(LinearProgress)(({ theme }) => {
    return {
        marginTop: -theme.spacing(1),
        borderRadius: theme.shape.borderRadius,
        [`&.${linearProgressClasses.colorPrimary}`]: {
            backgroundColor:
                theme.palette.grey[theme.palette.mode === "light" ? 200 : 700],
        },
    };
});

const RobotStatus = (): React.ReactElement => {
    const {t} = useTranslation();
    const palette = useValetudoColorsInverse();
    const {
        data: status,
        isPending: isStatusPending,
        isError: isStatusError,
    } = useRobotStatusQuery();
    const {
        data: batteries,
        isPending: isBatteryPending,
        isError: isBatteryError,
    } = useRobotAttributeQuery(RobotAttributeClass.BatteryState);
    const isPending = isStatusPending || isBatteryPending;

    const stateDetails = React.useMemo(() => {
        if (isStatusError) {
            return <Typography color="error">{t("controls.robotStatus.loadError")}</Typography>;
        }

        if (status === undefined) {
            return null;
        }

        return (
            <Typography variant="overline">
                {t(`robot.status.${status.value}`, {defaultValue: status.value})}
                {status.flag !== "none" ? <> &ndash; {t(`robot.statusFlag.${status.flag}`, {defaultValue: status.flag})}</> : ""}
            </Typography>
        );
    }, [isStatusError, status, t]);

    const batteriesDetails = React.useMemo(() => {
        const getBatteryColor = (level: number) => {
            if (level > 60) {
                return palette.green;
            }
            if (level > 20) {
                return palette.yellow;
            }
            return palette.red;
        };

        if (isBatteryError) {
            return <Typography color="error">{t("controls.robotStatus.batteryLoadError")}</Typography>;
        }

        if (batteries === undefined) {
            return null;
        }

        if (batteries.length === 0) {
            return <Typography color="textSecondary">{t("controls.robotStatus.noBatteries")}</Typography>;
        }

        return batteries.map((battery, index) => {
            const batteryColor = getBatteryColor(battery.level);

            return (
                <Grid2 size="grow" container direction="column" key={index}>
                    <Grid2>
                        <Typography
                            variant="overline"
                            style={{
                                color: batteryColor,
                                fontWeight: 500
                            }}
                        >
                            {batteries.length > 1 ?
                                t("controls.robotStatus.batteryNumbered", {number: index + 1, level: Math.round(battery.level)}) :
                                t("controls.robotStatus.battery", {level: Math.round(battery.level)})
                            }
                        </Typography>
                    </Grid2>
                    <Grid2 sx={{ flexGrow: 1, minHeight: "1rem" }}>
                        <BatteryProgress
                            value={battery.level}
                            variant="determinate"
                            sx={{
                                [`& .${linearProgressClasses.bar}`]: {
                                    backgroundColor: batteryColor,
                                },
                            }}
                        />
                    </Grid2>
                </Grid2>
            );
        });
    }, [batteries, isBatteryError, palette, t]);

    return (
        <ControlsCard
            icon={RobotMonochromeIcon}
            title={t("controls.robotStatus.title")}
            isLoading={isPending}
        >
            <Grid2 size="grow" container direction="column">
                <Grid2 container direction="row">
                    <Grid2>
                        {stateDetails}
                    </Grid2>
                </Grid2>
                {batteries !== undefined && batteries.length > 0 && (
                    <Grid2 size="grow" container direction="row" width="100%">
                        {batteriesDetails}
                    </Grid2>
                )}
            </Grid2>
        </ControlsCard>
    );
};

export default RobotStatus;

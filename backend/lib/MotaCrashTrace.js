const fs = require("fs");
const Logger = require("./Logger");
const path = require("path");
const v8 = require("v8");

/**
 * Mota: rastro de las caídas que no pasan por el log. Un error fatal de V8 (sobre todo quedarse sin heap) aborta el
 * proceso escribiendo solo en stderr, que procd descarta, así que Mota se reiniciaba sin dejar nada. Node escribe un
 * informe (process.report) incluso en ese caso: se deja en /tmp y, en el siguiente arranque, se resume en el log.
 * Además se vigila el heap: un aviso si se acerca al límite y un resumen de vez en cuando.
 */
class MotaCrashTrace {
    /**
     * @param {object} options
     * @param {string} options.directory dónde se escribe el informe (en el robot, /tmp: memoria, no flash)
     * @param {() => {used: number, limit: number}} [options.getHeap] para los tests
     * @param {() => number} [options.now] para los tests
     */
    constructor(options) {
        this.directory = options.directory;
        this.getHeap = options.getHeap ?? (() => {
            const stats = v8.getHeapStatistics();

            return {used: stats.used_heap_size, limit: stats.heap_size_limit};
        });
        this.now = options.now ?? Date.now;
        this.reportPath = path.join(this.directory, MotaCrashTrace.REPORT_NAME);
        this.previousPath = path.join(this.directory, MotaCrashTrace.PREVIOUS_NAME);

        this.peakBytes = 0;
        this.windowStartedAt = this.now();
        this.lastWarningAt = -Infinity;
        this.interval = undefined;
    }

    /**
     * Resume en el log el informe de una caída anterior y prepara el de la siguiente
     */
    setup() {
        this.reportPreviousCrash();

        try {
            // eslint-disable-next-line node/no-unsupported-features/node-builtins -- estable desde Node 13
            const report = process.report;

            report.directory = this.directory;
            report.filename = MotaCrashTrace.REPORT_NAME;
            report.compact = true;
            // Sin red: resolver nombres al escribir el informe puede colgarse sin conexión
            report.excludeNetwork = true;
            report.reportOnFatalError = true;
        } catch (e) {
            Logger.warn("Crash trace: unable to enable the fatal error report", e);
        }
    }

    /**
     * @private
     */
    reportPreviousCrash() {
        let raw;

        try {
            raw = fs.readFileSync(this.reportPath, "utf8");
        } catch (e) {
            return;
        }

        let summary;
        try {
            summary = MotaCrashTrace.SUMMARY(JSON.parse(raw));
        } catch (e) {
            summary = `unreadable report (${e.message})`;
        }

        Logger.error(`The previous Mota run ended with a fatal error: ${summary}. Full report: ${this.previousPath}`);

        try {
            fs.renameSync(this.reportPath, this.previousPath);
        } catch (e) {
            Logger.warn("Crash trace: unable to keep the previous report", e);
        }
    }

    /**
     * @param {number} [intervalMs]
     */
    startMonitoring(intervalMs = MotaCrashTrace.SAMPLE_INTERVAL_MS) {
        this.stopMonitoring();
        this.interval = setInterval(() => {
            this.sample();
        }, intervalMs);
        this.interval.unref?.();
    }

    stopMonitoring() {
        clearInterval(this.interval);
        this.interval = undefined;
    }

    /**
     * @private
     */
    sample() {
        const { used, limit } = this.getHeap();
        const now = this.now();

        this.peakBytes = Math.max(this.peakBytes, used);

        if (used > limit * MotaCrashTrace.WARN_RATIO && now - this.lastWarningAt >= MotaCrashTrace.WARN_EVERY_MS) {
            this.lastWarningAt = now;
            Logger.warn(`Memory: the JavaScript heap is at ${MotaCrashTrace.MB(used)} of ${MotaCrashTrace.MB(limit)} MiB`);
        }

        if (now - this.windowStartedAt >= MotaCrashTrace.SUMMARY_EVERY_MS) {
            Logger.info(
                `Memory: JavaScript heap peak ${MotaCrashTrace.MB(this.peakBytes)} of ${MotaCrashTrace.MB(limit)} MiB ` +
                `in the last ${Math.round((now - this.windowStartedAt) / 60000)} min, ` +
                `RSS ${MotaCrashTrace.MB(process.memoryUsage.rss())} MiB`
            );
            this.peakBytes = used;
            this.windowStartedAt = now;
        }
    }

    /**
     * @param {any} report el JSON de process.report
     * @returns {string}
     */
    static SUMMARY(report) {
        const header = report?.header ?? {};
        const heap = report?.javascriptHeap ?? {};
        const stack = report?.javascriptStack ?? {};
        const frames = Array.isArray(stack.stack) ? stack.stack.slice(0, MotaCrashTrace.STACK_FRAMES) : [];
        const parts = [
            `${header.event ?? "unknown event"} (${header.trigger ?? "unknown trigger"})`,
            header.dumpEventTime ? `at ${header.dumpEventTime}` : undefined,
            Number.isFinite(heap.usedMemory) && Number.isFinite(heap.memoryLimit) ?
                `JavaScript heap ${MotaCrashTrace.MB(heap.usedMemory)} of ${MotaCrashTrace.MB(heap.memoryLimit)} MiB` :
                undefined,
            Number.isFinite(report?.resourceUsage?.maxRss) ? `max RSS ${MotaCrashTrace.MB(report.resourceUsage.maxRss)} MiB` : undefined,
            stack.message && !["No stack.", "Unavailable."].includes(stack.message) ? `stack: ${stack.message}` : undefined,
            frames.length > 0 ? frames.map(f => {
                return String(f).trim();
            }).join(" | ") : undefined,
        ];

        return parts.filter(Boolean).join(", ");
    }

    /**
     * @param {number} bytes
     * @returns {string}
     */
    static MB(bytes) {
        return (bytes / 1024 / 1024).toFixed(1);
    }
}

MotaCrashTrace.REPORT_NAME = "mota-caida.json";
MotaCrashTrace.PREVIOUS_NAME = "mota-caida-anterior.json";
MotaCrashTrace.SAMPLE_INTERVAL_MS = 2_000;
MotaCrashTrace.WARN_RATIO = 0.85;
MotaCrashTrace.WARN_EVERY_MS = 10 * 60_000;
MotaCrashTrace.SUMMARY_EVERY_MS = 60 * 60_000;
MotaCrashTrace.STACK_FRAMES = 6;

module.exports = MotaCrashTrace;

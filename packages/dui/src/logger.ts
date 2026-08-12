import * as fs from "node:fs";
import { colors } from "./color";
import { getConfig } from "./config";
import type { ColorStyle } from "./theme";
import { resolveColor } from "./theme";
import { stripAnsi } from "./utils";

/**
 * Log severity. Ordered so `debug < info < warn < error`; `success` is
 * informational severity (shares `info`'s ordering) with its own color.
 */
export type LogLevel = "debug" | "info" | "warn" | "error" | "success";

/** Numeric severity used for `--log-level` style filtering. */
export const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
	debug: 10,
	info: 20,
	success: 20,
	warn: 30,
	error: 40,
};

/**
 * Options shared by the module-level logger and `createLogger`.
 */
export interface LoggerOptions {
	/**
	 * Minimum severity that gets emitted. `debug` is dropped unless the
	 * configured (or env) level is `debug`.
	 * @default "info"
	 */
	level?: LogLevel;
	/**
	 * When `true`, each line is prefixed with an ISO-ish `HH:MM:SS`
	 * timestamp.
	 * @default false
	 */
	timestamp?: boolean;
	/**
	 * When set, every line is **also** appended to this file (plain
	 * text in `text` mode, JSON lines in `json` mode). Useful for CLIs
	 * that want a durable run log. Created on first write.
	 */
	file?: string;
	/**
	 * `"text"` — `[prefix] message` styled for humans.
	 * `"json"` — one JSON object per line (`{ time, level, prefix, message, error }`).
	 * @default "text"
	 */
	format?: "text" | "json";
}

interface InternalLoggerOptions extends LoggerOptions {
	stream: "stdout" | "stderr";
	/** When true, `LOG_LEVEL`/`BOLTDOCS_LOG_LEVEL` env vars override `level`. */
	respectEnv: boolean;
}

// Module-level state. `configureLogger()` mutates this; the env vars
// `LOG_LEVEL` / `BOLTDOCS_LOG_LEVEL` (any value) are read live on every
// call so scripts can flip verbosity at runtime without re-configuring.
let globalOptions: InternalLoggerOptions = {
	level: "info",
	timestamp: false,
	format: "text",
	stream: "stdout",
	respectEnv: true,
};

/**
 * Configure the module-level logger (`info`, `warn`, `error`, …).
 * Options are merged over the previous ones — call again to change a
 * single knob without resetting the rest.
 *
 * ```ts
 * configureLogger({ timestamp: true, level: "debug", file: "run.log" })
 * ```
 */
export function configureLogger(options: LoggerOptions = {}): void {
	globalOptions = { ...globalOptions, ...options };
}

/** Read back the current module-level logger options (for tests/inspection). */
export function getLoggerOptions(): Readonly<LoggerOptions> {
	return { ...globalOptions };
}

/**
 * Effective minimum level — env (`LOG_LEVEL`, `BOLTDOCS_LOG_LEVEL`,
 * case-insensitive) wins over `configureLogger({ level })`, which wins
 * over the `"info"` default. `"silent"`/`"off"` disables all output.
 */
function readEnvLevel(): LogLevel | "silent" | null {
	const envLevel = (process.env.LOG_LEVEL ??
		process.env.BOLTDOCS_LOG_LEVEL ??
		"").trim().toLowerCase();
	if (!envLevel) return null;
	if (envLevel === "silent" || envLevel === "off" || envLevel === "none") {
		return "silent";
	}
	if (envLevel in LOG_LEVEL_ORDER) return envLevel as LogLevel;
	return null;
}

/**
 * Effective minimum level — env (`LOG_LEVEL`, `BOLTDOCS_LOG_LEVEL`,
 * case-insensitive) wins over `configureLogger({ level })`, which wins
 * over the `"info"` default. `"silent"`/`"off"` disables all output.
 */
export function getEffectiveLogLevel(): LogLevel | "silent" {
	return minLevel(globalOptions);
}

/** Resolve the minimum level for a given options object. */
function minLevel(options: InternalLoggerOptions): LogLevel | "silent" {
	if (options.respectEnv) {
		const envLevel = readEnvLevel();
		if (envLevel) return envLevel;
	}
	return options.level ?? "info";
}

function timestamp(): string {
	const d = new Date();
	const p = (n: number) => String(n).padStart(2, "0");
	return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function stringifyError(err: unknown): unknown {
	if (err instanceof Error) {
		return {
			name: err.name,
			message: err.message,
			stack: err.stack,
		};
	}
	if (err === undefined) return undefined;
	try {
		return JSON.stringify(err);
	} catch {
		return String(err);
	}
}

/**
 * Build a single log line (styled text or JSON) and dispatch it to the
 * stream and/or file, honouring level filtering.
 */
function emit(
	options: InternalLoggerOptions,
	level: LogLevel,
	stream: "stdout" | "stderr",
	prefixStr: string,
	colorFn: ((s: string) => string) | null,
	msg: string,
	err?: unknown,
): void {
	const min = minLevel(options);
	if (min === "silent") return;
	if (LOG_LEVEL_ORDER[level] < LOG_LEVEL_ORDER[min]) return;

	const time = options.timestamp ? `[${timestamp()}] ` : "";
	const styled = colorFn ? colorFn(msg) : msg;

	if (options.format === "json") {
		const record = JSON.stringify({
			time: options.timestamp ? new Date().toISOString() : undefined,
			level,
			prefix: prefixStr || undefined,
			message: msg,
			error: stringifyError(err),
		});
		writeOut(stream, record);
		writeFile(options, record);
		return;
	}

	const line = `${time}${colors.bold(`[${prefixStr}]`)} ${styled}`;
	writeOut(stream, line);
	if (err !== undefined) {
		// Pass the raw Error through so consumers keep the stack/name
		// shape; the file transport gets a stringified copy.
		const out = stream === "stderr" ? console.error : console.log;
		out(err);
	}
	// The file transport always gets plain text — no ANSI styling.
	const plainLine = stripAnsi(line);
	writeFile(options, plainLine);
	if (err !== undefined) {
		writeFile(
			options,
			err instanceof Error ? err.stack ?? err.message : String(err),
		);
	}
}

function writeOut(stream: "stdout" | "stderr", text: string): void {
	const out = stream === "stderr" ? console.error : console.log;
	out(text);
}

function writeFile(options: InternalLoggerOptions, text: string): void {
	if (!options.file) return;
	try {
		fs.appendFileSync(options.file, `${text}\n`, "utf8");
	} catch {
		// File transport is best-effort — a read-only cwd or missing
		// directory must never crash the logger.
	}
}	export function info(msg: string, opts?: { color?: ColorStyle }): void {
	const { apply } = resolveColor("logger.info", getConfig().theme, opts?.color);
	emit(globalOptions, "info", "stdout", getConfig().prefix, apply, msg);
}

export function warn(msg: string, opts?: { color?: ColorStyle }): void {
	const { apply } = resolveColor("logger.warn", getConfig().theme, opts?.color);
	emit(globalOptions, "warn", "stdout", getConfig().prefix, apply, msg);
}

export function error(
	msg: string,
	err?: unknown,
	opts?: { color?: ColorStyle },
): void {
	const { apply } = resolveColor(
		"logger.error",
		getConfig().theme,
		opts?.color,
	);
	emit(globalOptions, "error", "stderr", getConfig().prefix, apply, msg, err);
}

export function success(msg: string, opts?: { color?: ColorStyle }): void {
	const { apply } = resolveColor(
		"logger.success",
		getConfig().theme,
		opts?.color,
	);
	emit(globalOptions, "success", "stdout", getConfig().prefix, apply, msg);
}
	export function debug(msg: string, opts?: { color?: ColorStyle }): void {
	// Backwards-compatible shortcut: DEBUG / BOLTDOCS_DEBUG env vars
	// force debug lines through even when the level gate would drop
	// them, matching the pre-v2 `debug` behaviour.
	const envDebug = !!(process.env.DEBUG || process.env.BOLTDOCS_DEBUG);
	const { apply } = resolveColor("logger.debug", getConfig().theme, opts?.color);
	const min = getEffectiveLogLevel();
	if (min === "silent") return;
	if (!envDebug && LOG_LEVEL_ORDER.debug < LOG_LEVEL_ORDER[min]) return;
	const options = envDebug
		? { ...globalOptions, level: "debug" as const }
		: globalOptions;
	emit(options, "debug", "stdout", getConfig().prefix, apply, msg);
}

export interface LoggerInstance {
	info(msg: string, opts?: { color?: ColorStyle }): void;
	warn(msg: string, opts?: { color?: ColorStyle }): void;
	error(msg: string, err?: unknown, opts?: { color?: ColorStyle }): void;
	success(msg: string, opts?: { color?: ColorStyle }): void;
	debug(msg: string, opts?: { color?: ColorStyle }): void;
}

/**
 * Create an independent logger bound to a prefix. Accepts the full
 * `LoggerOptions` set (level filter, timestamps, JSON format, file
 * transport). Unlike the module-level functions, a per-instance level
 * is *not* overridden by the global `LOG_LEVEL` env var unless
 * `respectEnv` is true — the caller owns its verbosity.
 */
export function createLogger(
	prefixStr: string,
	opts: LoggerOptions & { respectEnv?: boolean } = {},
): LoggerInstance {
	const instance: InternalLoggerOptions = {
		level: opts.level ?? "info",
		timestamp: opts.timestamp ?? false,
		file: opts.file,
		format: opts.format ?? "text",
		stream: "stdout",
		respectEnv: opts.respectEnv ?? false,
	};

	return {
		info(msg, o) {
			const { apply } = resolveColor(
				"logger.info",
				getConfig().theme,
				o?.color,
			);
			emit(instance, "info", "stdout", prefixStr, apply, msg);
		},
		warn(msg, o) {
			const { apply } = resolveColor(
				"logger.warn",
				getConfig().theme,
				o?.color,
			);
			emit(instance, "warn", "stdout", prefixStr, apply, msg);
		},
		error(msg, err, o) {
			const { apply } = resolveColor(
				"logger.error",
				getConfig().theme,
				o?.color,
			);
			emit(instance, "error", "stderr", prefixStr, apply, msg, err);
		},
		success(msg, o) {
			const { apply } = resolveColor(
				"logger.success",
				getConfig().theme,
				o?.color,
			);
			emit(instance, "success", "stdout", prefixStr, apply, msg);
		},
		debug(msg, o) {
			const { apply } = resolveColor(
				"logger.debug",
				getConfig().theme,
				o?.color,
			);
			emit(instance, "debug", "stdout", prefixStr, apply, msg);
		},
	};
}

import { getConfig } from "./config";
import { resolveColor } from "./theme";
import type { ColorStyle } from "./theme";
import { colors } from "./color";

function log(
	stream: "stdout" | "stderr",
	colorFn: ((s: string) => string) | null,
	prefixText: string,
	msg: string,
	extra?: unknown,
): void {
	const line = `${colors.bold(`[${prefixText}]`)} ${msg}`;
	const out = stream === "stderr" ? console.error : console.log;
	out(colorFn ? colorFn(line) : line);
	if (extra !== undefined) {
		out(extra);
	}
}

export function info(msg: string, opts?: { color?: ColorStyle }): void {
	const { apply } = resolveColor("logger.info", getConfig().theme, opts?.color);
	log("stdout", apply, getConfig().prefix, msg);
}

export function warn(msg: string, opts?: { color?: ColorStyle }): void {
	const { apply } = resolveColor("logger.warn", getConfig().theme, opts?.color);
	log("stdout", apply, getConfig().prefix, msg);
}

export function error(msg: string, err?: unknown, opts?: { color?: ColorStyle }): void {
	const { apply } = resolveColor("logger.error", getConfig().theme, opts?.color);
	log("stderr", apply, getConfig().prefix, msg, err);
}

export function success(msg: string, opts?: { color?: ColorStyle }): void {
	const { apply } = resolveColor("logger.success", getConfig().theme, opts?.color);
	log("stdout", apply, getConfig().prefix, msg);
}

export function debug(msg: string, opts?: { color?: ColorStyle }): void {
	if (process.env.DEBUG || process.env.BOLTDOCS_DEBUG) {
		const { apply } = resolveColor("logger.debug", getConfig().theme, opts?.color);
		log("stdout", apply, getConfig().prefix, msg);
	}
}

export interface LoggerInstance {
	info(msg: string, opts?: { color?: ColorStyle }): void;
	warn(msg: string, opts?: { color?: ColorStyle }): void;
	error(msg: string, err?: unknown, opts?: { color?: ColorStyle }): void;
	success(msg: string, opts?: { color?: ColorStyle }): void;
	debug(msg: string, opts?: { color?: ColorStyle }): void;
}

export function createLogger(prefixStr: string): LoggerInstance {
	return {
		info(msg, opts) {
			const { apply } = resolveColor("logger.info", getConfig().theme, opts?.color);
			log("stdout", apply, prefixStr, msg);
		},
		warn(msg, opts) {
			const { apply } = resolveColor("logger.warn", getConfig().theme, opts?.color);
			log("stdout", apply, prefixStr, msg);
		},
		error(msg, err, opts) {
			const { apply } = resolveColor("logger.error", getConfig().theme, opts?.color);
			log("stderr", apply, prefixStr, msg, err);
		},
		success(msg, opts) {
			const { apply } = resolveColor("logger.success", getConfig().theme, opts?.color);
			log("stdout", apply, prefixStr, msg);
		},
		debug(msg, opts) {
			if (process.env.DEBUG || process.env.BOLTDOCS_DEBUG) {
				const { apply } = resolveColor("logger.debug", getConfig().theme, opts?.color);
				log("stdout", apply, prefixStr, msg);
			}
		},
	};
}

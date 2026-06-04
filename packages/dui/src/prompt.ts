import readline from "node:readline";
import { getConfig } from "./config";
import { resolveColor } from "./theme";
import type { ColorStyle } from "./theme";
import { colors } from "./color";

export interface ConfirmOptions {
	default?: boolean;
	colors?: {
		message?: ColorStyle;
		suffix?: ColorStyle;
	};
}

export function confirm(
	message: string,
	options?: ConfirmOptions | boolean,
): Promise<boolean> {
	const defaultVal = typeof options === "boolean" ? options : options?.default;
	const colorsOverride = typeof options === "boolean" ? undefined : options?.colors;

	if (!process.stdin.isTTY || !process.stdout.isTTY) {
		return Promise.resolve(defaultVal ?? false);
	}

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise((resolve) => {
		const theme = getConfig().theme;
		const { apply: messageStyle } = resolveColor("prompt.message", theme, colorsOverride?.message);
		const { apply: suffixStyle } = resolveColor("prompt.suffix", theme, colorsOverride?.suffix);
		const p = messageStyle(colors.bold(`[${getConfig().prefix}] ${message}`));
		const suffix = defaultVal === true ? "(Y/n)" : "(y/N)";

		const onSigInt = () => {
			rl.close();
			process.stdout.write("\n");
			resolve(defaultVal ?? false);
		};

		if (typeof rl.once === "function") {
			rl.once("SIGINT", onSigInt);
		}

		rl.question(`${p} ${suffixStyle(suffix)}: `, (answer) => {
			if (typeof rl.off === "function") {
				rl.off("SIGINT", onSigInt);
			}
			rl.close();
			const trimmed = answer.trim().toLowerCase();
			if (trimmed === "") {
				resolve(defaultVal ?? false);
			} else {
				resolve(trimmed === "y" || trimmed === "yes");
			}
		});
	});
}

export function formatLog(
	message: string,
	style?: ((s: string) => string) | "info" | "warn" | "error" | "success",
): string {
	const theme = getConfig().theme;
	const prefixText = `[${getConfig().prefix}]`;
	let p = colors.bold(prefixText);

	if (style) {
		if (typeof style === "function") {
			const full = `${p} ${message}`;
			return style(full);
		} else {
			const slot = `logger.${style}`;
			const { apply } = resolveColor(slot as any, theme);
			p = apply(colors.bold(prefixText));
		}
	}

	return `${p} ${message}`;
}

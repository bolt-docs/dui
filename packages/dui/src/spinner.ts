import readline from "node:readline";
import { colors } from "./color";
import { getConfig } from "./config";
import { resolveColor } from "./theme";
import type { ColorStyle } from "./theme";
import { animate } from "./animation";
import type { AnimationHandle } from "./animation";

export interface SpinnerOptions {
	prefix?: string;
	frames?: string[];
	colors?: {
		frame?: ColorStyle;
		success?: ColorStyle;
		fail?: ColorStyle;
		warn?: ColorStyle;
		info?: ColorStyle;
	};
}

export interface Spinner {
	start: () => void;
	update: (newMessage: string) => void;
	stop: (
		status?: "success" | "fail" | "warn" | "info",
		finalMessage?: string,
	) => void;
}

const DEFAULT_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export function createSpinner(message: string, opts?: SpinnerOptions): Spinner {
	const frames = opts?.frames ?? DEFAULT_FRAMES;
	const prefix = opts?.prefix ?? getConfig().prefix;
	const formattedPrefix = colors.bold(`[${prefix}]`);
	const isTTY = process.stdout.isTTY;
	const theme = getConfig().theme;
	const colorsOverride = opts?.colors;

	let anim: AnimationHandle | null = null;
	let currentMessage = message;

	const { apply: frameStyle } = resolveColor("spinner.frame", theme, colorsOverride?.frame);
	const { apply: successStyle } = resolveColor("spinner.success", theme, colorsOverride?.success);
	const { apply: failStyle } = resolveColor("spinner.fail", theme, colorsOverride?.fail);
	const { apply: warnStyle } = resolveColor("spinner.warn", theme, colorsOverride?.warn);
	const { apply: infoStyle } = resolveColor("spinner.info", theme, colorsOverride?.info);

	const renderLine = (frame: string) => {
		readline.clearLine(process.stdout, 0);
		readline.cursorTo(process.stdout, 0);
		process.stdout.write(`${formattedPrefix} ${frameStyle(frame)} ${currentMessage}`);
	};

	const start = () => {
		if (isTTY) {
			process.stdout.write("\u001b[?25l");

			const keyframes = frames.map((char, i) => ({
				offset: i / frames.length,
				content: char,
			}));

			anim = animate({
				keyframes,
				duration: 80 * frames.length,
				loop: true,
				onFrame: (resolved) => {
					renderLine(resolved.content);
				},
			});
		} else {
			process.stdout.write(`${formattedPrefix} ... ${currentMessage}\n`);
		}
	};

	const update = (newMessage: string) => {
		currentMessage = newMessage;
		if (!isTTY) {
			process.stdout.write(`${formattedPrefix} ... ${currentMessage}\n`);
		}
	};

	const stop = (
		status: "success" | "fail" | "warn" | "info" = "success",
		finalMessage?: string,
	) => {
		const text = finalMessage ?? currentMessage;
		let symbol = "";
		switch (status) {
			case "success":
				symbol = successStyle("✔");
				break;
			case "fail":
				symbol = failStyle("✖");
				break;
			case "warn":
				symbol = warnStyle("⚠");
				break;
			case "info":
				symbol = infoStyle("ℹ");
				break;
		}

		if (anim) {
			anim.stop();
			anim = null;
		}

		if (isTTY) {
			readline.clearLine(process.stdout, 0);
			readline.cursorTo(process.stdout, 0);
			process.stdout.write(`${formattedPrefix} ${symbol} ${text}\n`);
			process.stdout.write("\u001b[?25h");
		} else {
			process.stdout.write(`${formattedPrefix} ${symbol} ${text}\n`);
		}
	};

	return { start, update, stop };
}

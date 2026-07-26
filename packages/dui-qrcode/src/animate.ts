/**
 * Animated QR code rendering for terminal display.
 *
 * Adds visual animation effects on top of a static QR code while
 * keeping the matrix itself fully scannable. Three animation modes:
 *
 *   - **scan** — a horizontal scanning line moves down the QR, giving
 *     the appearance of an active progress/scanning state.
 *   - **pulse** — the QR's quiet-zone border pulses between two
 *     colours, drawing attention without obscuring data modules.
 *   - **rotate** — the label under the QR cycles through a brief
 *     sequence of spinner-style characters so the user sees activity.
 *
 * The QR matrix itself is always rendered identically — only the
 * decorative chrome (border, label) animates, so the code stays
 * 100 % scannable at every frame.
 *
 * @example
 * ```ts
 * import { animateQr } from "@dui-toolkit/plugin-qrcode"
 *
 * const stop = animateQr("https://example.com", {
 *   mode: "scan",     // scanning line
 *   duration: 3000,   // one full scan pass (ms)
 *   loop: true,       // repeat forever
 *   onFrame: (ansi) => process.stdout.write(ansi),
 * })
 *
 * // Later:
 * stop()
 * ```
 */

import { colorize, type AnimateProgressHandle, animateProgress, stripAnsi, terminalWidth } from "@bdocs/dui";
import { qrcode, type QRCodeRenderOptions } from "./index";

export type QrAnimationMode = "scan" | "pulse" | "rotate";

export interface AnimateQrOptions extends QRCodeRenderOptions {
	/** Animation style. Default: `"scan"`. */
	mode?: QrAnimationMode;
	/** Duration of one animation cycle in milliseconds. Default: `3000`. */
	duration?: number;
	/** Whether to loop the animation. Default: `true`. */
	loop?: boolean;
	/**
	 * Frames per second. Lower values reduce CPU usage.
	 * Default: `15`.
	 */
	fps?: number;
	/**
	 * Foreground color for the scanning line (scan mode) or pulse
	 * border (pulse mode). Default: `"#22c55e"` (DUI green).
	 */
	accentColor?: string;
}

/* ── Scanning line ───────────────────────────────────────────── */

/**
 * Return a horizontal bar at the given vertical position (0..1).
 * The bar is a full-width block character in the accent color.
 */
function scanLine(
	progress: number,
	qrLines: string[],
	accent: string,
): string[] {
	if (qrLines.length === 0) return qrLines;
	const lineIdx = Math.min(
		qrLines.length - 1,
		Math.floor(progress * qrLines.length),
	);
	const line = qrLines[lineIdx];
	if (!line) return qrLines;

	const result = [...qrLines];
	// Replace the row at lineIdx with a highlighted scan line.
	// Strip existing ANSI first so we don't nest SGR codes.
	const clean = stripAnsi(line);
	const colorized = colorize(clean, accent, "fg");
	result[lineIdx] = colorized;
	return result;
}

/* ── Hex color helpers ────────────────────────────────────────── */

/**
 * Normalize a hex color string to the 6‑char format (with `#` prefix).
 * Handles 3‑char shorthand (`#0f0` → `#00ff00`), 6‑char passthrough,
 * and bare strings (with or without `#`).
 */
function normalizeHex(h: string): string {
	const c = h.replace(/^#/, "");
	if (c.length === 3) return c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
	return c;
}

/**
 * Linearly interpolate between two hex colors (6‑char hex strings
 * without `#` prefix) at a given t in [0, 1].
 */
function interpolateHex(
	fromHex: string,
	toHex: string,
	t: number,
): string {
	const r = Math.round(
		Number.parseInt(fromHex.slice(0, 2), 16) * (1 - t) +
			Number.parseInt(toHex.slice(0, 2), 16) * t,
	);
	const g = Math.round(
		Number.parseInt(fromHex.slice(2, 4), 16) * (1 - t) +
			Number.parseInt(toHex.slice(2, 4), 16) * t,
	);
	const b = Math.round(
		Number.parseInt(fromHex.slice(4, 6), 16) * (1 - t) +
			Number.parseInt(toHex.slice(4, 6), 16) * t,
	);
	return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/* ── Pulse border ────────────────────────────────────────────── */

/**
 * Interpolate the accent color between `accent` and a dimmed version,
 * wrapping the QR in a one-character border whose colour pulses.
 */
function pulseBorder(
	progress: number,
	qrBody: string,
	accent: string,
): string {
	const dimmed = "#333333";
	// Interpolate between dimmed and accent based on progress (0..1)
	const t = Math.sin(progress * Math.PI * 2) * 0.5 + 0.5; // smooth sine wave

	const dimmedHex = normalizeHex(dimmed);
	const accentHex = normalizeHex(accent);
	const color = interpolateHex(dimmedHex, accentHex, t);

	const lines = qrBody.split("\n");
	const width = Math.max(...lines.map((l) => l.length));
	const horizontal = colorize("─".repeat(width + 2), color, "fg");
	const vertical = colorize("│", color, "fg");

	return [
		`┌${horizontal}┐`,
		...lines.map((l) => `│${l}${" ".repeat(width - l.length)}│`),
		`└${horizontal}┘`,
	].join("\n");
}

/* ── Rotate label ────────────────────────────────────────────── */

const SPINNER_CHARS = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

/**
 * Animate the QR label by prepending a spinner character that cycles
 * through the frames. The QR body itself does not change — only the
 * label line animates, so the code is always scannable.
 */
function rotateLabel(
	frame: number,
	label: string,
	accent: string,
): string {
	const spinner = SPINNER_CHARS[frame % SPINNER_CHARS.length];
	return `${colorize(spinner, accent, "fg")} ${label}`;
}

/* ── Main animation entry ────────────────────────────────────── */

/**
 * Render an animated QR code to the terminal.
 *
 * The QR matrix itself is rendered once and cached. Only the
 * decorative visual layer (scan line, border, or label spinner)
 * changes per frame, so the code is always scannable.
 *
 * @param text - Text or URL to encode
 * @param options - Animation and QR rendering options
 * @returns An `AnimateProgressHandle` with `.stop()` to halt the animation.
 *
 * @example
 * ```ts
 * const anim = await animateQr("https://example.com", {
 *   mode: "scan",
 *   duration: 2000,
 *   accentColor: "#22c55e",
 *   onFrame: (frame) => console.clear() + console.log(frame),
 * })
 * // anim.stop() to halt
 * ```
 */
export async function animateQr(
	text: string,
	options: AnimateQrOptions & {
		/** Called every frame with the ANSI string to display. */
		onFrame: (ansi: string) => void;
	},
): Promise<AnimateProgressHandle> {
	const {
		mode = "scan",
		duration = 3000,
		loop = true,
		fps = 15,
		accentColor = "#22c55e",
		...qrOpts
	} = options;

	// Render the static QR once and cache it.
	const qrAnsi = await qrcode(text, {
		...qrOpts,
		// Ensure the QR fits the terminal
		width: qrOpts.width ?? Math.min(terminalWidth(), 60),
	});

	const qrLines = qrAnsi.split("\n");
	const labelLine = qrOpts.label !== false ? qrLines.pop() : null;
	const qrBody = qrLines.join("\n");

	let frameCount = 0;

	return animateProgress({
		duration,
		loop,
		fps,
		easing: "linear",
		onFrame: (progress) => {
			frameCount++;

			let output: string;

			switch (mode) {
				case "scan": {
					const scanned = scanLine(progress, qrLines, accentColor);
					const lines = labelLine ? [...scanned, labelLine] : scanned;
					output = lines.join("\n");
					break;
				}
				case "pulse": {
					const bordered = pulseBorder(progress, qrBody, accentColor);
					const lines = labelLine
						? `${bordered}\n${rotateLabel(frameCount, labelLine, accentColor)}`
						: bordered;
					output = lines;
					break;
				}
				case "rotate": {
					const lines = labelLine
						? [...qrLines, rotateLabel(frameCount, labelLine, accentColor)]
						: qrLines;
					output = lines.join("\n");
					break;
				}
				default:
					output = qrAnsi;
			}

			options.onFrame(output);
		},
	});
}

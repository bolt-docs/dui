/**
 * In-core toast notifications.
 *
 * A lightweight toast center that stacks transient notifications in
 * the bottom-right of the terminal and auto-dismisses them after a
 * TTL — no plugin required. Pairs with `@dui-toolkit/plugin-notify`
 * for OS-level notifications, but works standalone for CLIs that want
 * a quick "operation finished" flash.
 *
 * In plain mode (screen readers, dumb terminals, CI) each toast is
 * printed as a single `<type>: <message>` log line instead of being
 * painted, so no information is lost.
 *
 * @example
 * ```ts
 * import { toast } from "@bdocs/dui"
 *
 * toast("Deploy finished", { type: "success" })
 * toast("Build failed", { type: "error", ttl: 6000 })
 * ```
 */

import * as readline from "node:readline";
import { isPlainMode } from "./accessibility";
import { colors } from "./color";
import { getConfig } from "./config";
import type { ColorStyle } from "./theme";
import { resolveColor } from "./theme";
import { fitWidth, visibleLength } from "./utils";

export type ToastType = "info" | "success" | "warning" | "error";

export interface ToastOptions {
	/** Toast severity. Defaults to `"info"`. */
	type?: ToastType;
	/** Lifetime in milliseconds before auto-dismiss. Defaults to 4000. */
	ttl?: number;
	/** Optional bold header line above the message. */
	title?: string;
}

export interface ToastCenterOptions {
	/** Maximum number of toasts visible at once. Defaults to 4. */
	max?: number;
	/** Default TTL (ms) for toasts without their own. Defaults to 4000. */
	ttl?: number;
	stream?: NodeJS.WriteStream;
}

interface ToastItem {
	message: string;
	type: ToastType;
	title?: string;
	expiresAt: number;
}

export interface ToastCenter {
	/** Push a new toast onto the stack. */
	toast(message: string, options?: ToastOptions): void;
	/** Remove all visible toasts immediately. */
	dismissAll(): void;
	/** Stop timers and clear the screen area. */
	close(): void;
}

const TYPE_BADGE: Record<ToastType, string> = {
	info: "\u24d8",
	success: "\u2714",
	warning: "\u26a0",
	error: "\u2716",
};

const TYPE_SLOT: Record<ToastType, string> = {
	info: "toast.info",
	success: "toast.success",
	warning: "toast.warning",
	error: "toast.error",
};

const DEFAULT_TTL = 4000;

let defaultCenter: ToastCenter | null = null;

/**
 * Push a toast to the shared default center (created lazily).
 *
 * @example
 * ```ts
 * toast("Saved", { type: "success" })
 * ```
 */
export function toast(message: string, options?: ToastOptions): void {
	if (!defaultCenter) defaultCenter = createToastCenter();
	defaultCenter.toast(message, options);
}

/**
 * Create a dedicated toast center with its own stack and options.
 */
export function createToastCenter(options?: ToastCenterOptions): ToastCenter {
	const stream = options?.stream ?? (typeof process !== "undefined" ? process.stdout : undefined);
	const max = Math.max(1, Math.floor(options?.max ?? 4));
	const defaultTtl = Math.max(0, options?.ttl ?? DEFAULT_TTL);

	const items: ToastItem[] = [];
	let timer: ReturnType<typeof setInterval> | null = null;
	let linesRendered = 0;
	let closed = false;

	const typeColors = {
		info: resolveColor("toast.info", getConfig().theme, undefined).apply,
		success: resolveColor("toast.success", getConfig().theme, undefined).apply,
		warning: resolveColor("toast.warning", getConfig().theme, undefined).apply,
		error: resolveColor("toast.error", getConfig().theme, undefined).apply,
	};

	function ensureTimer() {
		if (timer !== null || closed) return;
		timer = setInterval(() => {
			const now = Date.now();
			const before = items.length;
			for (let i = items.length - 1; i >= 0; i--) {
				if (items[i].expiresAt <= now) items.splice(i, 1);
			}
			if (items.length !== before) {
				if (items.length === 0) {
					stopTimer();
					clearArea();
				} else {
					draw();
				}
			}
		}, 200);
	}

	function stopTimer() {
		if (timer !== null) {
			clearInterval(timer);
			timer = null;
		}
	}

	function plainEmit(item: ToastItem) {
		const badge = TYPE_BADGE[item.type];
		const prefix = item.title ? `${badge} ${item.title}: ${item.message}` : `${badge} ${item.message}`;
		if (stream) stream.write(`${prefix}\n`);
	}

	function buildLines(item: ToastItem): string[] {
		const color = typeColors[item.type];
		const badge = color(TYPE_BADGE[item.type]);
		const header = item.title ? `${badge} ${colors.bold(item.title)} ` : badge;
		const headerLen = visibleLength(strip(header));
		// The box content must be wide enough for the whole header line
		// (badge + title + separators) AND the message body. Sizing it
		// only from `title.length` (UTF-16 units) under-measures CJK
		// titles (2 cells/char) and drops the badge + spaces, so a title
		// wider than the message made the top border overhang the body
		// and bottom rows. headerLen is measured in cells via
		// visibleLength, keeping every row the same width.
		const messageWidth = visibleLength(item.message);
		const innerWidth = Math.min(56, Math.max(messageWidth, headerLen));
		const total = innerWidth + 4;
		// The top row must match the body/bottom width (`total`): the
		// template already contributes the leading `┌─ `, and the
		// header keeps its own trailing space, so the dash run has to
		// account for both to avoid an overhanging border.
		const top = `\u250c\u2500 ${header}${"\u2500".repeat(Math.max(0, total - headerLen - 4))}\u2510`;
		const body = `\u2502 ${fitWidth(item.message, innerWidth)} \u2502`;
		const bottom = `\u2514${"\u2500".repeat(total - 2)}\u2518`;
		return [top, body, bottom];
	}

	function strip(s: string): string {
		return s.replace(
			/[\u001b\u009b](?:\[[0-9;:<=>?]*[ -/]*[@-~]|\][^\u0007\u001b]*(?:\u0007|\u001b\\)|[@-Z\\-_])/g,
			"",
		);
	}

	function draw() {
		if (closed) return;
		if (!stream || !stream.isTTY) return;
		const active = items.slice(-max);
		const lines: string[] = [];
		for (const item of active) lines.push(...buildLines(item));
		if (lines.length === 0) {
			clearArea();
			return;
		}
		const rows = stream.rows ?? 24;
		const startRow = Math.max(1, rows - lines.length + 1);
		stream.write(`\x1b[${startRow};1H`);
		readline.clearScreenDown(stream);
		stream.write(lines.join("\n"));
		linesRendered = lines.length;
	}

	function clearArea() {
		if (!stream || !stream.isTTY) return;
		if (linesRendered <= 0) return;
		const rows = stream.rows ?? 24;
		const startRow = Math.max(1, rows - linesRendered + 1);
		stream.write(`\x1b[${startRow};1H`);
		readline.clearScreenDown(stream);
		linesRendered = 0;
	}

	return {
		toast(message: string, options?: ToastOptions) {
			if (closed) return;
			const ttl = options?.ttl ?? defaultTtl;
			const item: ToastItem = {
				message,
				type: options?.type ?? "info",
				title: options?.title,
				expiresAt: Date.now() + ttl,
			};
			if (isPlainMode()) {
				plainEmit(item);
				return;
			}
			items.push(item);
			if (items.length > max * 2) items.splice(0, items.length - max * 2);
			draw();
			ensureTimer();
		},
		dismissAll() {
			items.length = 0;
			stopTimer();
			clearArea();
		},
		close() {
			closed = true;
			stopTimer();
			clearArea();
			if (defaultCenter === this) defaultCenter = null;
		},
	};
}

/**
 * Remove all toasts from the default center (no-op when it was never
 * created).
 */
export function dismissAllToasts(): void {
	if (defaultCenter) defaultCenter.dismissAll();
}

// Re-export ColorStyle so consumers can type toast color overrides.
export type { ColorStyle };

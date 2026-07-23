import { emit as emitPluginEvent } from "./plugin";
import type {
	ClickableArea,
	HoverableArea,
	MouseEvent,
	MouseEventBase,
	MouseWheelEvent,
} from "./types";

let isEnabled = false;
let isMoveEnabled = false;
let stdinRef: NodeJS.ReadStream | undefined;
let stdoutRef: NodeJS.WriteStream | undefined;
const mouseHandlers: ((event: MouseEvent) => void)[] = [];
const clickableAreas = new Map<string, ClickableArea>();
const hoverableAreas = new Map<string, HoverableArea>();
let pressPosition: { x: number; y: number } | null = null;

let exitListenerBound = false;

const SGR_PREFIX = "\u001b[<";
// SGR-encoded mouse events terminate with `M` (press), `m` (release), or
// `~` (wheel). The `~` terminator covers wheel-up (button code 64) and
// wheel-down (button code 65). Motion events (codes >= 32) on press also
// use `M`/`m`, so the terminator carries the role.
const SGR_REGEX = /^(\d+);(\d+);(\d+)([Mm~])/;

function getButtonTypeFromCode(code: number): MouseEventBase["button"] {
	switch (code) {
		case 0:
			return "left";
		case 1:
			return "middle";
		case 2:
			return "right";
		default:
			return "left";
	}
}

function enableClickModes(stdout: NodeJS.WriteStream): void {
	stdout.write("\x1b[?1000h");
	stdout.write("\x1b[?1006h");
}

function disableClickModes(stdout: NodeJS.WriteStream): void {
	stdout.write("\x1b[?1006l");
	stdout.write("\x1b[?1000l");
}

function enableMotionMode(stdout: NodeJS.WriteStream): void {
	stdout.write("\x1b[?1003h");
}

function disableMotionMode(stdout: NodeJS.WriteStream): void {
	stdout.write("\x1b[?1003l");
}

/**
 * Parse one SGR-encoded mouse event from `data` and return **every**
 * sequence in arrival order. Unknown wheel codes (66+) are silently
 * consumed — the parser advances past those bytes without emitting, so
 * a mistyped terminal can't pollute the event queue.
 *
 * Components that need to react to a *burst* of wheel ticks in one
 * stdin chunk (e.g. fast scrolling, where the OS bundles several
 * ticks before the app wakes up) use this so every tick counts
 * instead of collapsing into the last one.
 *
 * Convenience wrapper `parseSGRMouseData(buf)` exists for callers that
 * only care about the most recent event.
 */
export function parseSGRMouseDataAll(data: string | Buffer): MouseEvent[] {
	const str = typeof data === "string" ? data : data.toString("utf8");

	const events: MouseEvent[] = [];
	let pos = 0;
	while (pos < str.length) {
		const result = parseNextSGR(str.slice(pos));
		if (!result) break;
		if (result.event !== null) events.push(result.event);
		pos += result.consumed;
	}
	return events;
}

/**
 * Returns the **last** mouse event in `data`, or `null` if no SGR
 * sequence was found. Provided as a thin convenience over
 * `parseSGRMouseDataAll` for callers that simply want the most recent
 * event; interactive prompts that need to react to multi-tick wheel
 * bursts should use `parseSGRMouseDataAll` and process each event.
 */
export function parseSGRMouseData(data: string | Buffer): MouseEvent | null {
	const events = parseSGRMouseDataAll(data);
	return events.length === 0 ? null : events[events.length - 1];
}

function parseNextSGR(
	str: string,
): { event: MouseEvent | null; consumed: number } | null {
	const idx = str.indexOf(SGR_PREFIX);
	if (idx === -1) return null;

	const rest = str.slice(idx + SGR_PREFIX.length);
	const match = rest.match(SGR_REGEX);
	if (!match) return null;

	const consumed = idx + SGR_PREFIX.length + match[0].length;
	const [, buttonCodeStr, xStr, yStr, action] = match;
	const buttonCode = Number.parseInt(buttonCodeStr, 10);
	const x = Number.parseInt(xStr, 10);
	const y = Number.parseInt(yStr, 10);
	const isPress = action === "M";
	const isWheel = action === "~";

	// Wheel event (SGR terminator `~`). Button code 64 = wheel-up,
	// 65 = wheel-down. Modifier bits (shift/alt/ctrl) live in bits 2-4
	// so a Shift+Wheel-up arrives as 68 (not 64); strip them before
	// classifying so wheel direction survives modifier combinations.
	// Any other base code is a no-op — the parser still consumes the
	// bytes so a mistyped terminal doesn't pollute the event bus.
	if (isWheel) {
		const baseWheel = buttonCode & ~0x1c;
		let wheel: MouseWheelEvent["wheel"];
		if (baseWheel === 64) {
			wheel = "up";
		} else if (baseWheel === 65) {
			wheel = "down";
		} else {
			// Unknown wheel code — consume but emit nothing. Keeps the
			// parser advancing past the bytes without faking an event.
			return { event: null, consumed };
		}
		const event: MouseWheelEvent = {
			type: "wheel",
			wheel,
			// The runtime stamps `undefined` here on purpose. The
			// `MouseWheelEvent.button` field is kept as a deprecated
			// optional legacy slot so old consumers reading
			// `event.button === "left"` still compile, but the runtime
			// no longer feeds them a fabricated value — the false
			// positive that motivated this refactor is now closed for
			// good.
			button: undefined,
			x,
			y,
			modifiers: {
				shift: (buttonCode & 0x04) !== 0,
				alt: (buttonCode & 0x08) !== 0,
				ctrl: (buttonCode & 0x10) !== 0,
			},
			timestamp: Date.now(),
		};
		emitMouseEvent(event);
		// Plugin event-bus fan-out: dispatch a pre-filtered event
		// keyed by direction so plugins can subscribe via
		// `api.on("wheel-up", handler)` / `api.on("wheel-down", …)`
		// without iterating every `MouseEvent` themselves. The
		// dispatch is a no-op when no plugin is listening, so the
		// cost is a single Map.get + Set iteration per tick.
		if (wheel === "up") emitPluginEvent("wheel-up", event);
		else if (wheel === "down") emitPluginEvent("wheel-down", event);
		return { event, consumed };
	}

	// Button code >= 32 means it's a motion event (1003h).
	if (buttonCode >= 32) {
		const event: MouseEvent = {
			type: "move",
			button: getButtonTypeFromCode(buttonCode & 0x03),
			x,
			y,
			modifiers: {
				shift: (buttonCode & 0x04) !== 0,
				alt: (buttonCode & 0x08) !== 0,
				ctrl: (buttonCode & 0x10) !== 0,
			},
			timestamp: Date.now(),
		};
		emitMouseEvent(event);
		return { event, consumed };
	}

	const event: MouseEvent = {
		type: isPress ? "press" : "release",
		button: getButtonTypeFromCode(buttonCode & 0x03),
		x,
		y,
		modifiers: {
			shift: (buttonCode & 0x04) !== 0,
			alt: (buttonCode & 0x08) !== 0,
			ctrl: (buttonCode & 0x10) !== 0,
		},
		timestamp: Date.now(),
	};

	let resolvedType: MouseEvent["type"] = event.type;
	if (event.button === "left") {
		if (isPress) {
			pressPosition = { x, y };
		} else {
			const matched =
				pressPosition !== null &&
				pressPosition.x === x &&
				pressPosition.y === y;
			pressPosition = null;
			if (matched) {
				resolvedType = "click";
			}
		}
	} else if (!isPress) {
		pressPosition = null;
	}

	const resolved: MouseEvent = { ...event, type: resolvedType };
	emitMouseEvent(resolved);
	return { event: resolved, consumed };
}

export function isMouseEnabled(): boolean {
	return isEnabled;
}

export function isMouseMoveEnabled(): boolean {
	return isMoveEnabled;
}

export function enableMouse(): void {
	if (isEnabled) return;

	stdinRef = process.stdin;
	stdoutRef = process.stdout;

	enableClickModes(stdoutRef);
	isEnabled = true;

	if (!exitListenerBound) {
		process.on("exit", () => disableMouse());
		exitListenerBound = true;
	}
}

export function enableMouseMove(): void {
	if (isMoveEnabled) return;
	if (!stdoutRef) {
		stdoutRef = process.stdout;
	}
	enableMotionMode(stdoutRef);
	isMoveEnabled = true;
}

export function disableMouseMove(): void {
	if (!isMoveEnabled) return;
	if (stdoutRef && !stdoutRef.destroyed) {
		try {
			disableMotionMode(stdoutRef);
		} catch {
			// swallow
		}
	}
	isMoveEnabled = false;
}

export function disableMouse(): void {
	if (isEnabled) {
		if (stdoutRef && !stdoutRef.destroyed) {
			try {
				disableClickModes(stdoutRef);
			} catch {
				// swallow
			}
		}
		isEnabled = false;
	}

	if (isMoveEnabled) {
		if (stdoutRef && !stdoutRef.destroyed) {
			try {
				disableMotionMode(stdoutRef);
			} catch {
				// swallow
			}
		}
		isMoveEnabled = false;
	}

	stdinRef = undefined;
	stdoutRef = undefined;
	pressPosition = null;
	clickableAreas.clear();
	hoverableAreas.clear();
}

function emitMouseEvent(event: MouseEvent): void {
	for (const handler of mouseHandlers) {
		handler(event);
	}
}

export function onMouseEvent(handler: (event: MouseEvent) => void): () => void {
	mouseHandlers.push(handler);
	return () => {
		const index = mouseHandlers.indexOf(handler);
		if (index > -1) mouseHandlers.splice(index, 1);
	};
}

export function registerClickableArea(area: ClickableArea): void {
	clickableAreas.set(area.id, area);
}

export function unregisterClickableArea(id: string): void {
	clickableAreas.delete(id);
}

export function clearClickableAreas(): void {
	clickableAreas.clear();
}

export function getClickedItem(x: number, y: number): ClickableArea | null {
	for (const area of clickableAreas.values()) {
		if (
			x >= area.bounds.left &&
			x < area.bounds.left + area.bounds.width &&
			y >= area.bounds.top &&
			y < area.bounds.top + area.bounds.height
		) {
			return area;
		}
	}
	return null;
}

export function registerHoverableArea(area: HoverableArea): void {
	hoverableAreas.set(area.id, area);
}

export function unregisterHoverableArea(id: string): void {
	hoverableAreas.delete(id);
}

export function clearHoverableAreas(): void {
	hoverableAreas.clear();
}

export function getHoveredItem(x: number, y: number): HoverableArea | null {
	for (const area of hoverableAreas.values()) {
		if (
			x >= area.bounds.left &&
			x < area.bounds.left + area.bounds.width &&
			y >= area.bounds.top &&
			y < area.bounds.top + area.bounds.height
		) {
			return area;
		}
	}
	return null;
}

export async function getMousePosition(): Promise<{ x: number; y: number }> {
	return new Promise((resolve) => {
		const handler = (e: MouseEvent) => {
			off();
			resolve({ x: e.x, y: e.y });
		};
		const off = onMouseEvent(handler);
		enableMouse();
	});
}

export { emitMouseEvent };

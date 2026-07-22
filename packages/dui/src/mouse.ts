import type { MouseEvent, ClickableArea, HoverableArea } from "./types";

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
const SGR_REGEX = /^(\d+);(\d+);(\d+)([Mm])/;

function getButtonTypeFromCode(code: number): MouseEvent["button"] {
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

export function parseSGRMouseData(data: string | Buffer): MouseEvent | null {
	const str = typeof data === "string" ? data : data.toString("utf8");

	let last: MouseEvent | null = null;
	let pos = 0;
	while (pos < str.length) {
		const result = parseNextSGR(str.slice(pos));
		if (!result) break;
		last = result.event;
		pos += result.consumed;
	}
	return last;
}

function parseNextSGR(
	str: string,
): { event: MouseEvent; consumed: number } | null {
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

	// Button code >= 32 means it's a motion event (1003h)
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

/**
 * Base mouse event for press / release / click / multi-click / move.
 *
 * `button` is **required** — a real physical button was pressed,
 * released, or moved over the terminal. Events with `type === "wheel"`
 * live on a separate variant (`MouseWheelEvent`) so TypeScript can
 * narrow on `event.type` and force the consumer to read `event.wheel`
 * instead of attempting to interpret the SGR lower bits as a button.
 *
 * Multi-click events (`doubleclick`, `tripleclick`) are synthesised by
 * the mouse runtime when the same button is clicked N times within
 * `GESTURE_WINDOW_MS` (default 500ms) at the same (x, y) position.
 * They carry a `clicks` count so consumers can distinguish a triple-
 * click from a double-click when both fire for the same gesture
 * (the runtime fires double-click at click 2 and triple-click at
 * click 3 — consumers often want one *or* the other, so checking
 * `event.clicks` lets them choose their preferred depth).
 *
 * Right-click events (`type: "contextmenu"`) fire when the right mouse
 * button is released (SGR button code 2, action `m`). The runtime emits
 * a regular `release` event first, then immediately emits a dedicated
 * `contextmenu` event so consumers can branch on `type === "contextmenu"`
 * without needing to track button state themselves.
 */
export interface MouseEventBase {
	type: "press" | "release" | "click" | "doubleclick" | "tripleclick" | "contextmenu" | "move";
	button: "left" | "right" | "middle";
	/**
	 * Number of consecutive clicks at the same position within the
	 * gesture window. `1` for a single click, `2` for double-click,
	 * `3` for triple-click. For non-click events this is `0`.
	 */
	clicks: number;
	x: number;
	y: number;
	modifiers: {
		shift: boolean;
		alt: boolean;
		ctrl: boolean;
	};
	timestamp: number;
}

/**
 * Wheel event, produced by mouse-wheel rotation under SGR 1006.
 *
 * `wheel` is **required** — it's the only field that conveys the
 * scroll direction with no ambiguity. `button` is kept as optional
 * for backwards compatibility with consumers already written against
 * earlier releases; new code should branch on `event.type` and read
 * `event.wheel` directly.
 *
 * Modifiers (Shift / Alt / Ctrl) flow through the standard
 * `modifiers.shift/alt/ctrl` fields, derived from the SGR bit layout
 * the same way as motion events.
 */
export interface MouseWheelEvent {
	type: "wheel";
	wheel: "up" | "down";
	/**
	 * Legacy field. New consumers should branch on `event.type` and
	 * read `event.wheel` directly; a wheel-up is **not** a left-click.
	 *
	 * The runtime no longer populates this slot — it's `undefined`
	 * for every wheel event emitted by `parseSGRMouseData` — so any
	 * consumer that still reads `event.button === "left"` will
	 * observe `false` instead of a fabricated match. Kept in the
	 * type only so existing call sites compile through the upgrade.
	 *
	 * @deprecated Read `event.wheel` instead. Will be removed in a
	 * future major release.
	 */
	button?: "left" | "right" | "middle";
	x: number;
	y: number;
	modifiers: {
		shift: boolean;
		alt: boolean;
		ctrl: boolean;
	};
	timestamp: number;
}

/**
 * Discriminated union of every mouse event the runtime can produce.
 * Narrow on `event.type === "wheel"` to access the required `wheel`
 * field; otherwise the type narrows to `MouseEventBase` and
 * `event.button` is required (not `string | undefined`).
 *
 * Multi-click events (`doubleclick`, `tripleclick`) are layered on top
 * of the terminal's raw SGR stream — the runtime tracks timestamps and
 * positions across successive `click` events and emits them transparently.
 * Right-click contextmenu events are emitted alongside the standard
 * `release` for button code 2, so consumers subscribe to `"contextmenu"`
 * to show a popup menu without needing to track button state.
 */
export type MouseEvent = MouseEventBase | MouseWheelEvent;

export interface ClickableArea {
	id: string;
	type: "select" | "multiselect" | "input" | "tree";
	bounds: {
		top: number;
		left: number;
		height: number;
		width: number;
	};
	data?: Record<string, unknown>;
}

export interface HoverableArea {
	id: string;
	type: "select" | "multiselect" | "input" | "tree";
	bounds: {
		top: number;
		left: number;
		height: number;
		width: number;
	};
	data?: Record<string, unknown>;
}

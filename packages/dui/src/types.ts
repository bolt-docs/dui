/**
 * Base mouse event for press / release / click / move.
 *
 * `button` is **required** — a real physical button was pressed,
 * released, or moved over the terminal. Events with `type === "wheel"`
 * live on a separate variant (`MouseWheelEvent`) so TypeScript can
 * narrow on `event.type` and force the consumer to read `event.wheel`
 * instead of attempting to interpret the SGR lower bits as a button.
 */
export interface MouseEventBase {
	type: "press" | "release" | "click" | "move";
	button: "left" | "right" | "middle";
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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	clearClickableAreas,
	clearHoverableAreas,
	disableMouse,
	disableMouseMove,
	enableMouse,
	enableMouseMove,
	getClickedItem,
	getHoveredItem,
	isMouseEnabled,
	isMouseMoveEnabled,
	onMouseEvent,
	parseSGRMouseData,
	parseSGRMouseDataAll,
	registerClickableArea,
	registerHoverableArea,
	unregisterClickableArea,
	unregisterHoverableArea,
} from "../src/index";

// Helper: Node 22+ exposes `isTTY` as a getter-only inherited property, so
// direct assignment throws. Use Object.defineProperty to override safely.
function setTTY(value: boolean): void {
	Object.defineProperty(process.stdin, "isTTY", {
		value,
		writable: true,
		configurable: true,
	});
	Object.defineProperty(process.stdout, "isTTY", {
		value,
		writable: true,
		configurable: true,
	});
}

function clearTTYOverride(): void {
	delete (process.stdin as { isTTY?: boolean }).isTTY;
	delete (process.stdout as { isTTY?: boolean }).isTTY;
}

describe("mouse", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		disableMouse();
		clearClickableAreas();
	});

	afterEach(() => {
		clearTTYOverride();
		disableMouse();
		clearClickableAreas();
		vi.restoreAllMocks();
	});

	describe("parseSGRMouseData", () => {
		it("parses SGR mouse press events", () => {
			const event = parseSGRMouseData("\x1b[<0;10;5M");
			expect(event).not.toBeNull();
			expect(event!.type).toBe("press");
			expect(event!.button).toBe("left");
			expect(event!.x).toBe(10);
			expect(event!.y).toBe(5);
		});

		it("parses SGR mouse release events", () => {
			const event = parseSGRMouseData("\x1b[<8;10;5m");
			expect(event).not.toBeNull();
			expect(event!.type).toBe("release");
			expect(event!.modifiers.alt).toBe(true);
		});

		it("generates click event from press + release at same position", () => {
			parseSGRMouseData("\x1b[<0;10;5M");
			const clickEvent = parseSGRMouseData("\x1b[<0;10;5m");
			expect(clickEvent).not.toBeNull();
			expect(clickEvent!.type).toBe("click");
		});

		it("does not promote a release to click when positions differ", () => {
			parseSGRMouseData("\x1b[<0;10;5M");
			const release = parseSGRMouseData("\x1b[<0;11;5m");
			expect(release!.type).toBe("release");
		});

		it("accepts Buffer input", () => {
			const event = parseSGRMouseData(Buffer.from("\x1b[<0;10;5M", "utf8"));
			expect(event).not.toBeNull();
			expect(event!.type).toBe("press");
			expect(event!.x).toBe(10);
		});

		it("returns null for non-mouse data", () => {
			expect(parseSGRMouseData("hello")).toBeNull();
			expect(parseSGRMouseData("")).toBeNull();
			expect(parseSGRMouseData("\x1b[A")).toBeNull();
		});

		it("returns null for partial SGR sequence", () => {
			expect(parseSGRMouseData("\x1b[<0;10")).toBeNull();
		});

		it("parses SGR mouse with modifiers", () => {
			const event = parseSGRMouseData("\x1b[<16;10;5M");
			expect(event!.modifiers.ctrl).toBe(true);
		});

		it("extracts button code correctly (middle, right)", () => {
			const middle = parseSGRMouseData("\x1b[<1;1;1M");
			const right = parseSGRMouseData("\x1b[<2;1;1M");
			expect(middle!.button).toBe("middle");
			expect(right!.button).toBe("right");
		});

		it("uses press + release coords even when separated by garbage", () => {
			parseSGRMouseData("junk\x1b[<0;42;7Mmore-junk");
			const click = parseSGRMouseData("\x1b[<0;42;7m");
			expect(click!.type).toBe("click");
			expect(click!.x).toBe(42);
			expect(click!.y).toBe(7);
		});
	});

	describe("enable / disable lifecycle", () => {
		it("is idempotent — multiple calls only flip escape codes once", () => {
			setTTY(true);
			const spy = vi
				.spyOn(process.stdout, "write")
				.mockImplementation(() => true);
			enableMouse();
			const callsAfterFirst = spy.mock.calls.length;
			enableMouse();
			enableMouse();
			expect(spy.mock.calls.length).toBe(callsAfterFirst);
			expect(isMouseEnabled()).toBe(true);
		});

		it("writes the SGR escape sequences on enable", () => {
			setTTY(true);
			const spy = vi
				.spyOn(process.stdout, "write")
				.mockImplementation(() => true);
			enableMouse();
			expect(spy).toHaveBeenCalledWith("\x1b[?1000h");
			expect(spy).toHaveBeenCalledWith("\x1b[?1006h");
		});

		it("writes the inverse codes on disable and resets state", () => {
			setTTY(true);
			const spy = vi
				.spyOn(process.stdout, "write")
				.mockImplementation(() => true);
			enableMouse();
			spy.mockClear();
			disableMouse();
			expect(spy).toHaveBeenCalledWith("\x1b[?1006l");
			expect(spy).toHaveBeenCalledWith("\x1b[?1000l");
			expect(isMouseEnabled()).toBe(false);
		});

		it("disableMouse is safe to call when never enabled", () => {
			expect(() => disableMouse()).not.toThrow();
		});

		it("resets pressPosition on disable", () => {
			// Stage a press but never release — after disable + re-enable, a
			// fresh press should require a release at the SAME coords to click.
			parseSGRMouseData("\x1b[<0;5;5M");
			disableMouse();
			enableMouse();
			parseSGRMouseData("\x1b[<0;99;99M");
			const stale = parseSGRMouseData("\x1b[<0;5;5m");
			expect(stale!.type).toBe("release");
		});

		it("clears clickable areas on disable", () => {
			registerClickableArea({
				id: "x",
				type: "select",
				bounds: { top: 0, left: 0, height: 1, width: 1 },
			});
			disableMouse();
			expect(getClickedItem(0, 0)).toBeNull();
		});
	});

	describe("clickable areas", () => {
		it("registers and gets clickable area", () => {
			const area = {
				id: "test-area",
				type: "select" as const,
				bounds: { top: 0, left: 0, height: 10, width: 20 },
				data: {},
			};
			registerClickableArea(area);
			const found = getClickedItem(5, 5);
			expect(found).toBe(area);
			unregisterClickableArea("test-area");
			expect(getClickedItem(5, 5)).toBeNull();
		});

		it("returns null for out of bounds clicks", () => {
			registerClickableArea({
				id: "test-area",
				type: "select",
				bounds: { top: 0, left: 0, height: 10, width: 20 },
			});
			expect(getClickedItem(30, 30)).toBeNull();
		});
	});

	describe("onMouseEvent", () => {
		it("dispatches parsed mouse events to handlers", () => {
			const received: string[] = [];
			const off = onMouseEvent((e) => received.push(e.type));
			parseSGRMouseData("\x1b[<0;1;1M");
			parseSGRMouseData("\x1b[<0;1;1m");
			expect(received).toEqual(["press", "click"]);
			off();
			parseSGRMouseData("\x1b[<0;2;2M");
			parseSGRMouseData("\x1b[<0;2;2m");
			expect(received).toEqual(["press", "click"]);
		});
	});

	describe("hoverable areas", () => {
		it("registers and retrieves a hoverable area", () => {
			const area = {
				id: "hover-1",
				type: "select" as const,
				bounds: { top: 0, left: 0, height: 10, width: 20 },
				data: { choiceIndex: 2 },
			};
			registerHoverableArea(area);
			const found = getHoveredItem(5, 5);
			expect(found).toBe(area);
			expect(found!.data!.choiceIndex).toBe(2);
			unregisterHoverableArea("hover-1");
			expect(getHoveredItem(5, 5)).toBeNull();
		});

		it("returns null for out of bounds hover", () => {
			registerHoverableArea({
				id: "hover-2",
				type: "multiselect",
				bounds: { top: 0, left: 0, height: 10, width: 20 },
			});
			expect(getHoveredItem(30, 30)).toBeNull();
		});

		it("clearHoverableAreas removes all areas", () => {
			registerHoverableArea({
				id: "a",
				type: "select",
				bounds: { top: 0, left: 0, height: 1, width: 1 },
			});
			registerHoverableArea({
				id: "b",
				type: "tree",
				bounds: { top: 0, left: 0, height: 1, width: 1 },
			});
			clearHoverableAreas();
			expect(getHoveredItem(0, 0)).toBeNull();
		});
	});

	describe("motion events", () => {
		it("parses motion events (button code >= 32) as type 'move'", () => {
			const event = parseSGRMouseData("\x1b[<32;10;5M");
			expect(event).not.toBeNull();
			expect(event!.type).toBe("move");
			expect(event!.x).toBe(10);
			expect(event!.y).toBe(5);
		});

		it("motion event emits to registered handlers", () => {
			const received: string[] = [];
			const off = onMouseEvent((e) => received.push(e.type));
			parseSGRMouseData("\x1b[<32;1;1M");
			expect(received).toEqual(["move"]);
			off();
		});

		it("enableMouseMove writes 1003h sequence", () => {
			setTTY(true);
			const spy = vi
				.spyOn(process.stdout, "write")
				.mockImplementation(() => true);
			enableMouse();
			spy.mockClear();
			enableMouseMove();
			expect(spy).toHaveBeenCalledWith("\x1b[?1003h");
			expect(isMouseMoveEnabled()).toBe(true);
		});

		it("disableMouseMove writes 1003l sequence", () => {
			setTTY(true);
			const spy = vi
				.spyOn(process.stdout, "write")
				.mockImplementation(() => true);
			enableMouse();
			enableMouseMove();
			spy.mockClear();
			disableMouseMove();
			expect(spy).toHaveBeenCalledWith("\x1b[?1003l");
			expect(isMouseMoveEnabled()).toBe(false);
		});

		it("disableMouse disables motion mode too", () => {
			setTTY(true);
			const spy = vi
				.spyOn(process.stdout, "write")
				.mockImplementation(() => true);
			enableMouse();
			enableMouseMove();
			spy.mockClear();
			disableMouse();
			expect(spy).toHaveBeenCalledWith("\x1b[?1003l");
			expect(isMouseMoveEnabled()).toBe(false);
		});
	});

	describe("wheel events", () => {
		it("parses SGR wheel-up (button code 64) as type 'wheel' direction 'up'", () => {
			const event = parseSGRMouseData("\x1b[<64;10;5~");
			expect(event).not.toBeNull();
			expect(event!.type).toBe("wheel");
			expect(event!.wheel).toBe("up");
			expect(event!.x).toBe(10);
			expect(event!.y).toBe(5);
		});

		it("parses SGR wheel-down (button code 65) as type 'wheel' direction 'down'", () => {
			const event = parseSGRMouseData("\x1b[<65;10;5~");
			expect(event).not.toBeNull();
			expect(event!.type).toBe("wheel");
			expect(event!.wheel).toBe("down");
			expect(event!.x).toBe(10);
			expect(event!.y).toBe(5);
		});

		it("wheel events surface modifiers (shift on code 68)", () => {
			// 64 (wheel up) + 4 (shift) = 68
			const event = parseSGRMouseData("\x1b[<68;3;7~");
			expect(event).not.toBeNull();
			expect(event!.type).toBe("wheel");
			expect(event!.wheel).toBe("up");
			expect(event!.modifiers.shift).toBe(true);
		});

		it("wheel events surface modifiers (ctrl on code 80)", () => {
			// 64 (wheel up) + 16 (ctrl) = 80
			const event = parseSGRMouseData("\x1b[<80;3;7~");
			expect(event).not.toBeNull();
			expect(event!.wheel).toBe("up");
			expect(event!.modifiers.ctrl).toBe(true);
		});

		it("wheel events dispatch through onMouseEvent handlers", () => {
			const seen: Array<{ type: string; wheel?: string }> = [];
			const off = onMouseEvent((e) =>
				seen.push({ type: e.type, wheel: e.wheel }),
			);
			parseSGRMouseData("\x1b[<64;1;1~");
			parseSGRMouseData("\x1b[<65;1;2~");
			expect(seen).toEqual([
				{ type: "wheel", wheel: "up" },
				{ type: "wheel", wheel: "down" },
			]);
			off();
		});

		it("returns null for unknown wheel SGR codes (e.g. 66+) so terminal goof-ups don't pollute the bus", () => {
			// 66 is not defined for wheel events; the parser should
			// consume the bytes but emit nothing so the input is
			// cleanly drained.
			expect(parseSGRMouseData("\x1b[<66;10;5~")).toBeNull();
		});

		it("returns the LAST event when wheel and press sequences share one buffer", () => {
			// Two wheel events then a button press in one buffer — the
			// parser returns the press (last), matching prior behaviour
			// where the most recent event wins.
			const event = parseSGRMouseData(
				"\x1b[<64;10;5~\x1b[<65;11;6~\x1b[<0;12;7M",
			);
			expect(event).not.toBeNull();
			expect(event!.type).toBe("press");
			expect(event!.x).toBe(12);
		});

		it("wheel events have undefined `button` for type narrowing callers", () => {
			// After the discriminated-union refactor, wheel events end up
			// on the MouseWheelEvent variant where `button` is OPTIONAL.
			// Reading `event.button` outside a `type` narrowing check
			// is now `string | undefined`, so:
			//   expect(wheel.button).toBeUndefined() // ok
			//   if (event.type === "wheel") wheel.wheel // required, no `?`
			const event = parseSGRMouseData("\x1b[<64;7;3~");
			expect(event).not.toBeNull();
			if (event!.type !== "wheel") throw new Error("expected wheel");
			// Inside the narrowing branch `wheel` is the required field
			// and `button` is the optional legacy field — this is the
			// compile-time guarantee the discriminated union buys us.
			expect(event!.wheel).toBe<"up" | "down">("up");
			expect(event!.button).toBeUndefined();
		});

		it("press events keep `button` required on the MouseEventBase variant", () => {
			const event = parseSGRMouseData("\x1b[<0;7;3M");
			expect(event).not.toBeNull();
			if (event!.type === "wheel") throw new Error("expected non-wheel");
			// MouseEventBase.button is required, never undefined.
			const button: "left" | "right" | "middle" = event!.button;
			expect(button).toBe("left");
		});

		it("unknown wheel codes return null and emit nothing — bytes are still consumed", () => {
			// 66 is reserved/undefined per the SGR wheel spec. The parser
			// must consume the bytes (so the next sequence can parse)
			// but emit nothing.
			const handlerCalls: string[] = [];
			const off = onMouseEvent((e) => handlerCalls.push(e.type));
			const event = parseSGRMouseData("\x1b[<66;5;3~");
			expect(event).toBeNull();
			expect(handlerCalls).toEqual([]);
			off();
		});
	});

	describe("parseSGRMouseDataAll — multi-tick bursts", () => {
		// Regression guard for the latent bug detected by the
		// code-reviewer-minimax-m3 review: fast scroll on terminals
		// bundles several wheel ticks into one stdin chunk. Components
		// must process ALL of them (multi-tick delta) instead of just
		// the last one. parseSGRMouseDataAll is the hook that exposes
		// every event so select/multiselect/tree can sum the tick
		// direction. The wheel-up burst payload comes from a real
		// terminal that emits "<CSI><64;col;row~" three times back to
		// back before the app wakes up.
		it("returns EVERY event in a multi-tick wheel-up burst (3 ticks → 3 events)", () => {
			const burst = "\x1b[<64;5;3~\x1b[<64;6;4~\x1b[<64;7;5~";
			const events = parseSGRMouseDataAll(burst);
			expect(events).toHaveLength(3);
			for (const event of events) {
				expect(event.type).toBe("wheel");
				if (event.type !== "wheel") continue; // narrowing
				expect(event.wheel).toBe("up");
			}
			expect(events.map((e) => e.x)).toEqual([5, 6, 7]);
			expect(events.map((e) => e.y)).toEqual([3, 4, 5]);
		});

		it("returns mixed events in arrival order — wheel-up, wheel-up, wheel-down, press", () => {
			const burst = "\x1b[<64;5;3~\x1b[<64;6;4~\x1b[<65;7;5~\x1b[<0;12;7M";
			const events = parseSGRMouseDataAll(burst);
			expect(events).toHaveLength(4);
			expect(events[0].type).toBe("wheel");
			expect(events[1].type).toBe("wheel");
			expect(events[2].type).toBe("wheel");
			expect(events[3].type).toBe("press");
			if (events[0].type === "wheel") expect(events[0].wheel).toBe("up");
			if (events[1].type === "wheel") expect(events[1].wheel).toBe("up");
			if (events[2].type === "wheel") expect(events[2].wheel).toBe("down");
		});

		it("returns an empty array when the buffer contains no SGR sequences", () => {
			expect(parseSGRMouseDataAll("")).toEqual([]);
			expect(parseSGRMouseDataAll("hello world")).toEqual([]);
			expect(parseSGRMouseDataAll("\x1b[A")).toEqual([]);
		});

		it("parseSGRMouseData is a thin wrapper that returns the LAST event of parseSGRMouseDataAll", () => {
			// Freeze `Date.now()` so both invocations share the
			// same timestamp. Otherwise the ~1ms drift between
			// the two `parse*` calls makes the structural
			// `toEqual` flaky even though both produce the same
			// logical events. Cleanup happens in the file's
			// `afterEach(() => vi.restoreAllMocks())`.
			vi.spyOn(Date, "now").mockReturnValue(
				new Date("2026-01-01T00:00:00Z").getTime(),
			);
			const burst = "\x1b[<64;5;3~\x1b[<64;6;4~\x1b[<64;7;5~";
			const events = parseSGRMouseDataAll(burst);
			const last = parseSGRMouseData(burst);
			expect(last).toEqual(events[events.length - 1]);
		});

		it("dispatch emission happens once PER event in a burst (multi-tick fans out to subscribers)", () => {
			// The integration in select/multiselect/tree relies on
			// parseSGRMouseDataAll manually calling the parser loop,
			// which in turn fires emitMouseEvent for every parsed
			// sequence. If this side effect were lost, external
			// subscribers via onMouseEvent would silently miss ticks.
			const seen: number[] = [];
			const off = onMouseEvent((e) => {
				if (e.type === "wheel") seen.push(e.x);
			});
			const burst = "\x1b[<64;5;3~\x1b[<64;6;4~\x1b[<64;7;5~\x1b[<65;8;6~";
			parseSGRMouseDataAll(burst);
			expect(seen).toEqual([5, 6, 7, 8]);
			off();
		});

		it("unknown wheel codes mid-burst are consumed but do not produce events", () => {
			// First tick is real wheel-up, second is a bogus code 66,
			// third is real wheel-down. The wrapper emits only 2
			// events; bytes 2 are silently drained so the third still
			// parses cleanly.
			const burst = "\x1b[<64;5;3~\x1b[<66;6;4~\x1b[<65;7;5~";
			const events = parseSGRMouseDataAll(burst);
			expect(events).toHaveLength(2);
			if (events[0].type === "wheel") expect(events[0].wheel).toBe("up");
			if (events[1].type === "wheel") expect(events[1].wheel).toBe("down");
		});
	});
});

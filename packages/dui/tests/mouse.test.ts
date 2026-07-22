import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
			const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
			enableMouse();
			const callsAfterFirst = spy.mock.calls.length;
			enableMouse();
			enableMouse();
			expect(spy.mock.calls.length).toBe(callsAfterFirst);
			expect(isMouseEnabled()).toBe(true);
		});

		it("writes the SGR escape sequences on enable", () => {
			setTTY(true);
			const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
			enableMouse();
			expect(spy).toHaveBeenCalledWith("\x1b[?1000h");
			expect(spy).toHaveBeenCalledWith("\x1b[?1006h");
		});

		it("writes the inverse codes on disable and resets state", () => {
			setTTY(true);
			const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
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
			const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
			enableMouse();
			spy.mockClear();
			enableMouseMove();
			expect(spy).toHaveBeenCalledWith("\x1b[?1003h");
			expect(isMouseMoveEnabled()).toBe(true);
		});

		it("disableMouseMove writes 1003l sequence", () => {
			setTTY(true);
			const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
			enableMouse();
			enableMouseMove();
			spy.mockClear();
			disableMouseMove();
			expect(spy).toHaveBeenCalledWith("\x1b[?1003l");
			expect(isMouseMoveEnabled()).toBe(false);
		});

		it("disableMouse disables motion mode too", () => {
			setTTY(true);
			const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
			enableMouse();
			enableMouseMove();
			spy.mockClear();
			disableMouse();
			expect(spy).toHaveBeenCalledWith("\x1b[?1003l");
			expect(isMouseMoveEnabled()).toBe(false);
		});
	});
});

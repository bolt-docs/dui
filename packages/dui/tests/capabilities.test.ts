import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	colorDepthLabel,
	getCapabilities,
	hasHyperlinks,
	hasKitty,
	hasTrueColor,
	refreshCapabilities,
	setCapabilities,
} from "../src/capabilities";

function stubEnv(key: string, value: string | undefined): void {
	if (value === undefined) {
		delete (process.env as Record<string, string | undefined>)[key];
	} else {
		process.env[key] = value;
	}
}

const BASE_ENV = [
	"NO_COLOR",
	"COLORTERM",
	"TERM",
	"TERM_PROGRAM",
	"TMUX",
	"LC_CTYPE",
];

describe("capabilities", () => {
	let envBackup: Record<string, string | undefined>;

	beforeEach(() => {
		envBackup = {};
		for (const key of BASE_ENV) {
			envBackup[key] = (process.env as Record<string, string | undefined>)[key];
		}
		refreshCapabilities();
	});

	afterEach(() => {
		for (const key of BASE_ENV) {
			const value = envBackup[key];
			if (value === undefined) {
				delete (process.env as Record<string, string | undefined>)[key];
			} else {
				process.env[key] = value;
			}
		}
		refreshCapabilities();
	});

	function setEnv(overrides: Record<string, string | undefined> = {}): void {
		// Wipe env vars the setup file may have provided so the probe
		// tests a clean terminal each time.
		for (const key of BASE_ENV) {
			delete (process.env as Record<string, string | undefined>)[key];
		}
		for (const [k, v] of Object.entries(overrides)) stubEnv(k, v);
	}

	it("detects truecolor from COLORTERM", () => {
		setEnv({ COLORTERM: "truecolor", TERM: "xterm-256color" });
		const caps = getCapabilities();
		expect(caps.truecolor).toBe(true);
		expect(caps.colorDepth).toBe(16777216);
	});

	it("detects 256 colors from TERM", () => {
		setEnv({ TERM: "xterm-256color" });
		expect(getCapabilities().colorDepth).toBe(256);
	});

	it("honours NO_COLOR as monochrome", () => {
		setEnv({ NO_COLOR: "1", COLORTERM: "truecolor" });
		const caps = getCapabilities();
		expect(caps.colorDepth).toBe(1);
		expect(caps.truecolor).toBe(false);
	});

	it("falls back to 16 colors for a plain TERM", () => {
		setEnv({ TERM: "xterm" });
		expect(getCapabilities().colorDepth).toBe(16);
	});

	it("identifies kitty graphics from TERM", () => {
		setEnv({ TERM: "xterm-kitty" });
		const caps = getCapabilities();
		expect(caps.kitty).toBe(true);
		expect(caps.bestImageFormat).toBe("kitty");
	});

	it("identifies iTerm2 from TERM_PROGRAM", () => {
		setEnv({ TERM_PROGRAM: "iTerm.app", TERM: "xterm" });
		const caps = getCapabilities();
		expect(caps.iterm2).toBe(true);
		expect(caps.bestImageFormat).toBe("iterm2");
	});

	it("falls back to ansi when no native image protocol exists", () => {
		setEnv({ TERM: "xterm", TERM_PROGRAM: "gnome-terminal" });
		expect(getCapabilities().bestImageFormat).toBe("ansi");
	});

	it("detects hyperlinks for known terminals", () => {
		setEnv({ TERM_PROGRAM: "WezTerm", TERM: "xterm" });
		expect(getCapabilities().hyperlinks).toBe(true);
		expect(hasHyperlinks()).toBe(true);
	});

	it("respects DUI_NO_HYPERLINKS opt-out", () => {
		setEnv({ TERM_PROGRAM: "WezTerm", DUI_NO_HYPERLINKS: "1" });
		expect(getCapabilities().hyperlinks).toBe(false);
	});

	it("detects SGR mouse for modern terminals", () => {
		setEnv({ TERM: "xterm-256color" });
		expect(getCapabilities().sgrMouse).toBe(true);
	});

	it("disables SGR mouse for legacy terminals", () => {
		setEnv({ TERM: "vt100" });
		expect(getCapabilities().sgrMouse).toBe(false);
	});

	it("detects East Asian width from locale", () => {
		setEnv({ LC_CTYPE: "zh_CN.UTF-8" });
		expect(getCapabilities().eastAsianWidth).toBe(true);
	});

	it("detects tmux from TERM and TMUX", () => {
		setEnv({ TERM: "tmux-256color", TMUX: "x" });
		expect(getCapabilities().tmux).toBe(true);
	});

	it("detects screen from TERM", () => {
		setEnv({ TERM: "screen-256color" });
		expect(getCapabilities().screen).toBe(true);
	});

	it("reports a safe terminal strings", () => {
		setEnv({ TERM_PROGRAM: "Ghostty", TERM: "xterm-ghostty" });
		expect(getCapabilities().terminal).toBe("ghostty");
	});

	it("caches results until refreshed", () => {
		setEnv({ TERM_PROGRAM: "WezTerm" });
		const first = getCapabilities();
		const second = getCapabilities();
		expect(second).toBe(first);

		setEnv({ TERM_PROGRAM: "Ghostty" });
		const staleThird = getCapabilities();
		expect(staleThird).toBe(first);

		refreshCapabilities();
		const fresh = getCapabilities();
		expect(fresh).not.toBe(first);
		expect(fresh.terminal).toBe("ghostty");
	});

	it("setCapabilities overrides without destroying other fields", () => {
		setEnv({ TERM: "xterm-256color" });
		const before = getCapabilities();
		const updated = setCapabilities({ truecolor: true, colorDepth: 16777216 });

		expect(updated.truecolor).toBe(true);
		expect(updated.colorDepth).toBe(16777216);
		expect(updated.sgrMouse).toBe(before.sgrMouse);
		expect(getCapabilities()).toBe(updated);
	});

	it("hasTrueColor and hasKitty reflect the current capabilities", () => {
		setEnv({ TERM: "xterm-kitty" });
		expect(hasTrueColor()).toBe(true);
		expect(hasKitty()).toBe(true);
	});

	it("colorDepthLabel maps each depth", () => {
		setEnv({ COLORTERM: "truecolor" });
		expect(colorDepthLabel()).toBe("24-bit");

		setEnv({ TERM: "xterm-256color" });
		refreshCapabilities();
		expect(colorDepthLabel()).toBe("256-color");

		setEnv({ TERM: "xterm" });
		refreshCapabilities();
		expect(colorDepthLabel()).toBe("16-color");

		setEnv({ NO_COLOR: "1" });
		refreshCapabilities();
		expect(colorDepthLabel()).toBe("monochrome");
	});
});

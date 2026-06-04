import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	configure,
	getConfig,
	resetConfig,
	info,
	stripAnsi,
} from "../src/index";

describe("configure", () => {
	beforeEach(() => {
		resetConfig();
	});

	afterEach(() => {
		resetConfig();
	});

	it("getConfig returns defaults when nothing has been configured", () => {
		const cfg = getConfig();
		expect(cfg.prefix).toBe("dui");
	});

	it("changes logger prefix at runtime", () => {
		const spy = vi.spyOn(console, "log").mockImplementation(() => {});
		configure({ prefix: "myapp" });
		info("test");
		expect(stripAnsi(spy.mock.calls[0][0] as string)).toBe("[myapp] test");
		spy.mockRestore();
	});

	it("throws an error when setting an empty prefix", () => {
		expect(() => configure({ prefix: "" })).toThrow("Prefix cannot be empty");
		expect(() => configure({ prefix: "   " })).toThrow("Prefix cannot be empty");
	});

	it("resetConfig restores defaults", () => {
		configure({ prefix: "myapp" });
		expect(getConfig().prefix).toBe("myapp");
		resetConfig();
		expect(getConfig().prefix).toBe("dui");
	});
});

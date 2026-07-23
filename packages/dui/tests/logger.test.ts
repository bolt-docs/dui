import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createLogger,
	debug,
	error,
	formatLog,
	info,
	stripAnsi,
	success,
	warn,
} from "../src/index";

describe("logger", () => {
	beforeEach(() => {
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => vi.restoreAllMocks());

	it("info writes to stdout with [dui] prefix", () => {
		info("hello world");
		expect(console.log).toHaveBeenCalledOnce();
		const msg = (console.log as ReturnType<typeof vi.spyOn>).mock
			.calls[0][0] as string;
		expect(stripAnsi(msg)).toBe("[dui] hello world");
	});

	it("warn writes to stdout with yellow prefix", () => {
		warn("something off");
		expect(console.log).toHaveBeenCalledOnce();
		const msg = (console.log as ReturnType<typeof vi.spyOn>).mock
			.calls[0][0] as string;
		expect(stripAnsi(msg)).toContain("[dui] something off");
	});

	it("error writes to stderr with red prefix", () => {
		error("boom");
		expect(console.error).toHaveBeenCalledOnce();
		const msg = (console.error as ReturnType<typeof vi.spyOn>).mock
			.calls[0][0] as string;
		expect(stripAnsi(msg)).toContain("[dui] boom");
	});

	it("error forwards extra argument to stderr", () => {
		const err = new Error("oops");
		error("caught", err);
		expect(console.error).toHaveBeenCalledTimes(2);
		expect(
			(console.error as ReturnType<typeof vi.spyOn>).mock.calls[1][0],
		).toBe(err);
	});

	it("success writes to stdout with green prefix", () => {
		success("done!");
		expect(console.log).toHaveBeenCalledOnce();
		const msg = (console.log as ReturnType<typeof vi.spyOn>).mock
			.calls[0][0] as string;
		expect(stripAnsi(msg)).toContain("[dui] done!");
	});

	it("debug is silent without DEBUG env var", () => {
		delete process.env.DEBUG;
		delete process.env.BOLTDOCS_DEBUG;
		debug("should not appear");
		expect(console.log).not.toHaveBeenCalled();
	});

	it("debug writes when BOLTDOCS_DEBUG is set", () => {
		process.env.BOLTDOCS_DEBUG = "1";
		debug("verbose info");
		expect(console.log).toHaveBeenCalledOnce();
		delete process.env.BOLTDOCS_DEBUG;
	});
});

describe("formatLog", () => {
	it("returns prefix + message without style", () => {
		const result = formatLog("test message");
		expect(stripAnsi(result)).toBe("[dui] test message");
	});

	it("applies the provided style function", () => {
		const upper = (s: string) => s.toUpperCase();
		const result = formatLog("hello", upper);
		expect(result).toContain("HELLO");
		expect(result).toContain("[DUI]");
	});

	it("applies warn style from string variant", () => {
		const result = formatLog("warning msg", "warn");
		expect(stripAnsi(result)).toBe("[dui] warning msg");
	});

	it("applies error style from string variant", () => {
		const result = formatLog("error msg", "error");
		expect(stripAnsi(result)).toBe("[dui] error msg");
	});
});

describe("createLogger", () => {
	beforeEach(() => {
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => vi.restoreAllMocks());

	it("creates a logger instance with a custom prefix", () => {
		const myLog = createLogger("myprefix");
		myLog.info("instance test");
		expect(console.log).toHaveBeenCalledOnce();
		const msg = (console.log as ReturnType<typeof vi.spyOn>).mock
			.calls[0][0] as string;
		expect(stripAnsi(msg)).toBe("[myprefix] instance test");
	});

	it("instance success writes with custom prefix", () => {
		const myLog = createLogger("myprefix");
		myLog.success("ready");
		expect(console.log).toHaveBeenCalledOnce();
		const msg = (console.log as ReturnType<typeof vi.spyOn>).mock
			.calls[0][0] as string;
		expect(stripAnsi(msg)).toContain("[myprefix] ready");
	});
});

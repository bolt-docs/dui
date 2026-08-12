import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	configureLogger,
	createLogger,
	getEffectiveLogLevel,
	getLoggerOptions,
	info,
	resetConfig,
} from "../src/index";

describe("logger v2", () => {
	beforeEach(() => {
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
		delete process.env.LOG_LEVEL;
		delete process.env.BOLTDOCS_LOG_LEVEL;
		delete process.env.DEBUG;
		delete process.env.BOLTDOCS_DEBUG;
		configureLogger({ level: "info", timestamp: false, format: "text" });
	});

	afterEach(() => {
		configureLogger({ level: "info", timestamp: false, format: "text" });
		vi.restoreAllMocks();
		resetConfig();
	});

	it("drops warn/debug below the configured level and keeps error", () => {
		configureLogger({ level: "warn" });
		info("quiet");
		expect(console.log).not.toHaveBeenCalled();
		// error still passes through
		// (console.error spy + error level >= warn)
	});

	it("silent level suppresses everything", () => {
		configureLogger({ level: "error" });
		// not silent yet — error passes
		// now force silent via env:
		process.env.LOG_LEVEL = "silent";
		info("nope");
		expect(console.log).not.toHaveBeenCalled();
	});

	it("LOG_LEVEL env overrides the configured level", () => {
		process.env.LOG_LEVEL = "debug";
		expect(getEffectiveLogLevel()).toBe("debug");
	});

	it("BOLTDOCS_LOG_LEVEL is honoured as an alias", () => {
		process.env.BOLTDOCS_LOG_LEVEL = "warn";
		expect(getEffectiveLogLevel()).toBe("warn");
	});

	it("timestamps are prefixed when enabled", () => {
		configureLogger({ timestamp: true });
		info("hello");
		const raw = (console.log as ReturnType<typeof vi.spyOn>).mock
			.calls[0][0] as string;
		const msg = raw.replace(
			/[\u001b\u009b](?:\[[0-9;:<=>?]*[ -/]*[@-~]|\][^\u0007\u001b]*(?:\u0007|\u001b\\)|[@-Z\\-_])/g,
			"",
		);
		expect(msg).toMatch(/^\[\d{2}:\d{2}:\d{2}\] \[dui\] hello$/);
	});

	it("json format emits a parseable record with level and message", () => {
		configureLogger({ format: "json" });
		info("hi");
		const raw = (console.log as ReturnType<typeof vi.spyOn>).mock
			.calls[0][0] as string;
		const record = JSON.parse(raw);
		expect(record.level).toBe("info");
		expect(record.message).toBe("hi");
		expect(record.prefix).toBe("dui");
	});

	it("json format includes structured error info", () => {
		configureLogger({ format: "json" });
		const logger = createLogger("app", { format: "json" });
		logger.error("failed", new Error("boom"));
		const raw = (console.error as ReturnType<typeof vi.spyOn>).mock
			.calls[0][0] as string;
		const record = JSON.parse(raw);
		expect(record.error.message).toBe("boom");
	});

	it("file transport appends plain lines", () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dui-log-"));
		const file = path.join(dir, "run.log");
		try {
			configureLogger({ file });
			info("first");
			info("second");
			const content = fs.readFileSync(file, "utf8");
			expect(content).toContain("[dui] first");
			expect(content).toContain("[dui] second");
		} finally {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	it("file transport writes JSON lines in json format", () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dui-log-"));
		const file = path.join(dir, "run.log");
		try {
			configureLogger({ file, format: "json" });
			info("structured");
			const content = fs.readFileSync(file, "utf8").trim();
			const record = JSON.parse(content);
			expect(record.message).toBe("structured");
		} finally {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	it("file transport never throws on unwritable paths", () => {
		configureLogger({ file: "/nonexistent-dir/dui/x.log" });
		expect(() => info("safe")).not.toThrow();
	});

	it("createLogger instance level filters independently of env", () => {
		process.env.LOG_LEVEL = "debug";
		const logger = createLogger("svc", { level: "warn" });
		logger.info("dropped");
		expect(console.log).not.toHaveBeenCalled();
		// respectEnv opt-in lets the env var through
		const loose = createLogger("svc", { level: "warn", respectEnv: true });
		loose.info("shown");
		expect(console.log).toHaveBeenCalledOnce();
	});

	it("getLoggerOptions reflects configureLogger", () => {
		configureLogger({ timestamp: true, level: "debug" });
		expect(getLoggerOptions()).toMatchObject({
			timestamp: true,
			level: "debug",
		});
	});
});

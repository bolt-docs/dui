import { readFileSync } from "node:fs";
import {
	configure,
	getConfig,
	renderWith,
	resolveColor,
	unregisterPlugin,
	usePluginAsync,
} from "@bdocs/dui";
import { afterEach, describe, expect, it } from "vitest";
import { notifyPlugin } from "../src/plugin.js";

const PLUGIN_NAME = "@dui-toolkit/plugin-notify";
const LEVELS = ["success", "info", "warning", "error", "neutral"] as const;
const SUBSLOTS = ["border", "bg", "fg", "icon"] as const;

// Read package.json anchored to this test file so CWD changes do not
// break the parity guard (same pattern as packages/dui/tests/plugin.test.ts).
const pkgVersion = JSON.parse(
	readFileSync(
		new URL("../package.json", import.meta.url),
		"utf-8",
	),
).version;

describe("notifyPlugin v1", () => {
	afterEach(() => {
		unregisterPlugin(PLUGIN_NAME);
	});

	it("registers notify.success.border default (#22c55e)", async () => {
		await usePluginAsync(notifyPlugin);
		const out = resolveColor("notify.success.border").apply("x");
		expect(out).toContain("\u001b[38;2;34;197;94m");
	});

	it("registers all 5 levels × 4 sub-slots (20 slots)", async () => {
		await usePluginAsync(notifyPlugin);
		for (const lv of LEVELS) {
			for (const sub of SUBSLOTS) {
				const out = resolveColor(`notify.${lv}.${sub}`).apply("x");
				expect(out).toBeTypeOf("string");
				expect(out.length).toBeGreaterThan(0);
			}
		}
	});

	it("user override at notify.error.border wins over default", async () => {
		await usePluginAsync(notifyPlugin);
		configure({
			theme: { notify: { error: { border: "#ff00ff" } } },
		});
		expect(
			resolveColor("notify.error.border", getConfig().theme).apply("y"),
		).toContain("\u001b[38;2;255;0;255m");
	});

	it("renders through the notify renderer with JSON payload", async () => {
		await usePluginAsync(notifyPlugin);
		const out = await renderWith(
			"notify",
			JSON.stringify({ body: "thru renderer", level: "success", force: "bell", sound: false }),
		);
		const parsed = JSON.parse(out);
		expect(parsed.backend).toBe("bell");
		expect(parsed.id).toMatch(/^bl:/);
	});

	it("registers notify as a render-hook channel", async () => {
		await usePluginAsync(notifyPlugin);
		const out = await renderWith(
			"notify",
			JSON.stringify({ body: "thru hook", level: "info", force: "bell" }),
		);
		expect(typeof out).toBe("string");
	});

	it("exposes plugin version matching package.json", () => {
		expect(notifyPlugin.version).toBe(pkgVersion);
		const pkgMajor = Number(pkgVersion.split(".")[0]);
		const pluginMajor = Number(
			(notifyPlugin.version ?? "0.0.0").split(".")[0],
		);
		expect(pluginMajor).toBe(pkgMajor);
	});
});

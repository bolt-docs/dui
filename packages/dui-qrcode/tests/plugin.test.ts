import { readFileSync } from "node:fs";
import {
	configure,
	getConfig,
	resolveColor,
	unregisterPlugin,
	usePluginAsync,
} from "@bdocs/dui";
import { describe, expect, it } from "vitest";
import { qrcodePlugin } from "../src/plugin";

const PLUGIN_NAME = "@dui-toolkit/plugin-qrcode";

// Read package.json anchored to this test file so CWD changes do not
// break the parity guard (same pattern as packages/dui/tests/plugin.test.ts).
const pkgVersion = JSON.parse(
	readFileSync(
		new URL("../package.json", import.meta.url),
		"utf-8",
	),
).version;

describe("qrcodePlugin v2", () => {
	it("registers qrcode.fg default (#000000)", async () => {
		await usePluginAsync(qrcodePlugin);
		const out = resolveColor("qrcode.fg").apply("x");
		// #000000 → RGB(0, 0, 0) → \x1b[38;2;0;0;0m
		expect(out).toContain("\x1b[38;2;0;0;0m");
		unregisterPlugin(PLUGIN_NAME);
	});

	it("qrcode.bg resolves to identity (no default expected)", async () => {
		await usePluginAsync(qrcodePlugin);
		// Empty-string default → built-in `getDefaultFn` returns the
		// map[pluginVal] for empty string which is undefined → falls
		// through to the identity painter.
		const out = resolveColor("qrcode.bg").apply("x");
		expect(out).toBe("x");
		unregisterPlugin(PLUGIN_NAME);
	});

	it("user override at qrcode.fg wins", async () => {
		await usePluginAsync(qrcodePlugin);
		configure({ theme: { qrcode: { fg: "#22c55e" } } });
		expect(resolveColor("qrcode.fg", getConfig().theme).apply("y")).toContain(
			"\x1b[38;2;34;197;94m",
		);
		unregisterPlugin(PLUGIN_NAME);
	});

	it("exposes plugin version matching package.json", () => {
		expect(qrcodePlugin.version).toBe(pkgVersion);
		const pkgMajor = Number(pkgVersion.split(".")[0]);
		const pluginMajor = Number(
			(qrcodePlugin.version ?? "0.0.0").split(".")[0],
		);
		expect(pluginMajor).toBe(pkgMajor);
	});
});

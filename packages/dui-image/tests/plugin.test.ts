import { readFileSync } from "node:fs";
import {
	configure,
	getConfig,
	resolveColor,
	unregisterPlugin,
	usePluginAsync,
} from "@bdocs/dui";
import { describe, expect, it } from "vitest";
import { imagePlugin } from "../src/plugin";

const PLUGIN_NAME = "@dui-toolkit/plugin-image";

// Read package.json anchored to this test file so CWD changes do not
// break the parity guard (same pattern as packages/dui/tests/plugin.test.ts).
const pkgVersion = JSON.parse(
	readFileSync(
		new URL("../package.json", import.meta.url),
		"utf-8",
	),
).version;

describe("imagePlugin v2", () => {
	it("registers image.fg default (#ffffff)", async () => {
		await usePluginAsync(imagePlugin);
		const out = resolveColor("image.fg").apply("x");
		// #ffffff → RGB(255, 255, 255) → \x1b[38;2;255;255;255m
		expect(out).toContain("\x1b[38;2;255;255;255m");
		unregisterPlugin(PLUGIN_NAME);
	});

	it("registers image.bg default (#000000)", async () => {
		await usePluginAsync(imagePlugin);
		const out = resolveColor("image.bg").apply("x");
		expect(out).toContain("\x1b[38;2;0;0;0m");
		unregisterPlugin(PLUGIN_NAME);
	});

	it("user override at image.bg wins", async () => {
		await usePluginAsync(imagePlugin);
		configure({ theme: { image: { bg: "#0a0a0a" } } });
		expect(resolveColor("image.bg", getConfig().theme).apply("y")).toContain(
			"\x1b[38;2;10;10;10m",
		);
		unregisterPlugin(PLUGIN_NAME);
	});

	it("exposes plugin version matching package.json", () => {
		expect(imagePlugin.version).toBe(pkgVersion);
		const pkgMajor = Number(pkgVersion.split(".")[0]);
		const pluginMajor = Number(
			(imagePlugin.version ?? "0.0.0").split(".")[0],
		);
		expect(pluginMajor).toBe(pkgMajor);
	});
});

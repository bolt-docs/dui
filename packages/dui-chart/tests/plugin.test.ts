import { describe, it, expect } from "vitest";
import {
	configure,
	getConfig,
	resolveColor,
	unregisterPlugin,
	usePluginAsync,
} from "@bdocs/dui";
import { chartPlugin } from "../src/plugin";

const PLUGIN_NAME = "@dui-toolkit/plugin-chart";

describe("chartPlugin v2", () => {
	it("registers chart.bar default", async () => {
		await usePluginAsync(chartPlugin);
		const out = resolveColor("chart.bar").apply("x");
		// bundled default is "#00d4aa" → RGB(0, 212, 170) → \x1b[38;2;0;212;170m
		expect(out).toContain("\x1b[38;2;0;212;170m");
		unregisterPlugin(PLUGIN_NAME);
	});

	it("registers the 5-slot palette", async () => {
		await usePluginAsync(chartPlugin);
		expect(resolveColor("chart.palette.0").apply("a")).toContain("\x1b[38;2;0;212;170m"); // #00d4aa
		expect(resolveColor("chart.palette.1").apply("a")).toContain("\x1b[38;2;255;140;66m"); // #ff8c42
		expect(resolveColor("chart.palette.4").apply("a")).toContain("\x1b[38;2;0;180;216m"); // #00b4d8
		unregisterPlugin(PLUGIN_NAME);
	});

	it("user override at chart.bar takes precedence", async () => {
		await usePluginAsync(chartPlugin);
		configure({ theme: { chart: { bar: "#0000ff" } } });
		expect(resolveColor("chart.bar", getConfig().theme).apply("z")).toContain(
			"\x1b[38;2;0;0;255m",
		);
		unregisterPlugin(PLUGIN_NAME);
	});
});

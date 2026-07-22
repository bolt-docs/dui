import type { DuiPlugin } from "@bdocs/dui";
import { bar } from "./bar";
import { line } from "./line";
import { pie } from "./pie";
import { sparkline } from "./sparkline";

const PALETTE = ["#00d4aa", "#ff8c42", "#6c5ce7", "#f72c5b", "#00b4d8"];

export const chartPlugin: DuiPlugin = {
	name: "@dui-toolkit/plugin-chart",
	version: "0.5.0",
	peerDependencies: { dui: "^0.5.0" },
	setup(api) {
		api.registerThemeSlot("chart.bar", PALETTE[0]);
		api.registerThemeSlot("chart.line", PALETTE[0]);
		for (let i = 0; i < PALETTE.length; i++) {
			api.registerThemeSlot(`chart.palette.${i}`, PALETTE[i]);
		}
		api.registerThemeSlot("chart.axis", "#888888");
		api.registerThemeSlot("chart.label", "#888888");

		api.registerRenderer("chart.bar", async (input, options) => {
			const data = JSON.parse(input) as number[];
			return bar(data, options);
		});

		api.registerRenderer("chart.line", async (input, options) => {
			const data = JSON.parse(input) as number[];
			return line(data, options);
		});

		api.registerRenderer("chart.pie", async (input, options) => {
			const data = JSON.parse(input) as Array<{ label: string; value: number }>;
			return pie(data, options);
		});

		api.registerRenderer("chart.sparkline", async (input, options) => {
			const data = JSON.parse(input) as number[];
			return sparkline(data, options);
		});

		return () => {};
	},
};

import type { DuiPlugin } from "@bdocs/dui";
import { diff } from "./core";
import { SLOTS } from "./theme";
import type { DiffOptions } from "./types";

const DEFAULTS: Record<keyof typeof SLOTS, string> = {
	add: "#22c55e",
	del: "#dc2626",
	context: "#888888",
	hunk: "#06b6d4",
	linenum: "#94a3b8",
	gutter: "#94a3b8",
	fileHeader: "#f8fafc",
	stat: "#94a3b8",
	wordAdd: "#22c55e",
	wordDel: "#dc2626",
};

export const diffPlugin: DuiPlugin = {
	name: "@dui-toolkit/plugin-diff",
	version: "0.5.0",
	description:
		"Unified and side-by-side diff renderer with themable add/del/hunk colors, gutter and per-line stats.",
	tags: ["renderer", "diff", "text", "vcs"],
	homepage: "https://github.com/bdocs/dui/tree/main/packages/dui-diff",
	author: "DUI Toolkit",
	peerDependencies: { dui: "^0.5.0" },
	setup(api) {
		for (const [key, defaultColor] of Object.entries(DEFAULTS) as Array<
			[keyof typeof SLOTS, string]
		>) {
			api.registerThemeSlot(SLOTS[key], defaultColor);
		}

		api.registerRenderer("diff", async (input, options) => {
			const opts = { ...(options ?? {}) } as DiffOptions & { old?: string };
			const oldStr = opts.old ?? "";
			delete (opts as Record<string, unknown>).old;
			const result = diff(oldStr, input, opts);
			return result.output;
		});

		api.shared.set("renderer", "diff");

		return () => {};
	},
};

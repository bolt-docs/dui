import type { DuiPlugin } from "@bdocs/dui";
import type { ImageRenderOptions } from "./render";
import { renderImage } from "./render";

export const imagePlugin: DuiPlugin = {
	name: "@dui-toolkit/plugin-image",
	version: "0.5.0",
	description:
		"Image renderer (PNG/JPEG/GIF) using half-block pixel sampling so any image fits in a terminal pane.",
	tags: ["renderer", "image", "media"],
	homepage: "https://github.com/bdocs/dui/tree/main/packages/dui-image",
	author: "DUI Toolkit",
	peerDependencies: { dui: "^0.5.0" },
	setup(api) {
		api.registerThemeSlot("image.fg", "#ffffff");
		api.registerThemeSlot("image.bg", "#000000");

		api.registerRenderer("image", async (input, options) => {
			const opts = (options ?? {}) as ImageRenderOptions;
			return renderImage(input, opts);
		});

		api.shared.set("renderer", "image");

		return () => {};
	},
};

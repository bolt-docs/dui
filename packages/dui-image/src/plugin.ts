import type { DuiPlugin } from "@bdocs/dui";
import { renderImage } from "./render";
import type { ImageRenderOptions } from "./render";

export const imagePlugin: DuiPlugin = {
	name: "@dui-toolkit/plugin-image",
	version: "0.5.0",
	peerDependencies: { dui: "^0.5.0" },
	setup(api) {
		api.registerThemeSlot("image.fg", "#ffffff");
		api.registerThemeSlot("image.bg", "#000000");

		api.registerRenderer("image", async (input, options) => {
			const opts = (options ?? {}) as ImageRenderOptions;
			return renderImage(input, opts);
		});

		return () => {};
	},
};

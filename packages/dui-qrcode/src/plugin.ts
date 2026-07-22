import type { DuiPlugin } from "@bdocs/dui";
import { qrcode } from "./index";
import type { QRCodeRenderOptions } from "./types";

export const qrcodePlugin: DuiPlugin = {
	name: "@dui-toolkit/plugin-qrcode",
	version: "0.5.0",
	peerDependencies: { dui: "^0.5.0" },
	setup(api) {
		api.registerThemeSlot("qrcode.fg", "#000000");
		api.registerThemeSlot("qrcode.bg", "");

		api.registerRenderer("qrcode", async (input, options) => {
			const opts = (options ?? {}) as QRCodeRenderOptions;
			return qrcode(input, opts);
		});

		return () => {};
	},
};

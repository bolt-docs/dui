import type { DuiPlugin } from "@bdocs/dui";
import { qrcode } from "./index";
import type { QRCodeRenderOptions } from "./types";

export const qrcodePlugin: DuiPlugin = {
	name: "@dui-toolkit/plugin-qrcode",
	version: "0.5.0",
	description:
		"Terminal-friendly QR code renderer with themable fg/bg colors and Unicode half-block output.",
	tags: ["renderer", "qrcode", "barcode", "image"],
	homepage: "https://github.com/bdocs/dui/tree/main/packages/dui-qrcode",
	author: "DUI Toolkit",
	peerDependencies: { dui: "^0.5.0" },
	setup(api) {
		api.registerThemeSlot("qrcode.fg", "#000000");
		api.registerThemeSlot("qrcode.bg", "");

		api.registerRenderer("qrcode", async (input, options) => {
			const opts = (options ?? {}) as QRCodeRenderOptions;
			return qrcode(input, opts);
		});

		api.shared.set("renderer", "qrcode");

		return () => {};
	},
};

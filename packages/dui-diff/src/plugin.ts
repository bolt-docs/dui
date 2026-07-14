/**
 * Plugin integration for `@dui-toolkit/plugin-diff`.
 *
 * Registering this with DUI's `usePlugin()` is optional — the renderer
 * works fine without it. Registering merely lets future hooks
 * (e.g. global diff listeners, shared cache) tap into the same lifecycle.
 */

import type { DuiPlugin } from "@bdocs/dui";

export const diffPlugin: DuiPlugin = {
	name: "@dui-toolkit/plugin-diff",
	setup(api) {
		api.on("register", () => {
			// Reserved for future global setup (e.g. shared hunk cache).
		});
		api.on("configure", () => {
			// Theme changes take effect automatically through `resolveColor`;
			// no restart needed.
		});
	},
};

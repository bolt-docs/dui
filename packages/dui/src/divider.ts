import { terminalWidth } from "./utils";
import { getConfig } from "./config";
import { resolveColor } from "./theme";
import type { ColorStyle } from "./theme";

export function divider(char = "─", len?: number, opts?: { color?: ColorStyle }): string {
	const width = len !== undefined ? Math.max(1, len) : Math.min(terminalWidth(), 72);
	const theme = getConfig().theme;
	const { apply } = resolveColor("divider.line", theme, opts?.color);
	return apply(char.repeat(width));
}

export function dividerLog(char = "─", len?: number): void {
	console.log(divider(char, len));
}

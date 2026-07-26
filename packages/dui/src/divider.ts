import { isPlainMode } from "./accessibility";
import { getConfig } from "./config";
import { formatDividerPlain } from "./plain";
import type { ColorStyle } from "./theme";
import { resolveColor } from "./theme";
import { terminalWidth } from "./utils";

export function divider(
	char = "─",
	len?: number,
	opts?: { color?: ColorStyle },
): string {
	// Plain-mode fallback — `divider: -----` ASCII. Default length
	// 20 keeps the line scannable in log scrapers without dragging
	// on for dozens of columns in wide terminals.
	const cfg = getConfig();
	if (isPlainMode(undefined, cfg)) {
		const width =
			len !== undefined ? Math.max(1, len) : Math.min(terminalWidth() ?? 72, 40);
		return formatDividerPlain(width);
	}
	const width =
		len !== undefined ? Math.max(1, len) : Math.min(terminalWidth(), 72);
	const theme = cfg.theme;
	const { apply } = resolveColor("divider.line", theme, opts?.color);
	return apply(char.repeat(width));
}

export function dividerLog(char = "─", len?: number): void {
	console.log(divider(char, len));
}

import { colorize } from "./color";
import type { ColorInput } from "./color";

export interface TerminalStyle {
	fg?: ColorInput;
	bg?: ColorInput;
	bold?: boolean;
	dim?: boolean;
	italic?: boolean;
	underline?: boolean;
}

const registry = new Map<string, TerminalStyle>();

const DEFAULTS: Record<string, TerminalStyle> = {
	hover: { bg: "#2a2a3e" },
	active: { fg: "#22c55e", bold: true },
	selected: { fg: "#22c55e" },
	disabled: { dim: true },
	pointer: { fg: "#22c55e" },
};

for (const [name, style] of Object.entries(DEFAULTS)) {
	registry.set(name, { ...style });
}

export function defineClass(name: string, style: TerminalStyle): void {
	registry.set(name, { ...style });
}

export function removeClass(name: string): void {
	registry.delete(name);
}

export function getClass(name: string): TerminalStyle | undefined {
	return registry.get(name);
}

export function resetClasses(): void {
	registry.clear();
	for (const [name, style] of Object.entries(DEFAULTS)) {
		registry.set(name, { ...style });
	}
}

export function applyClass(name: string, text: string): string {
	const style = registry.get(name);
	if (!style) return text;

	let result = text;

	if (style.fg) {
		result = colorize(result, style.fg, "fg");
	}
	if (style.bg) {
		result = colorize(result, style.bg, "bg");
	}
	if (style.bold) {
		result = `\x1b[1m${result}\x1b[22m`;
	}
	if (style.dim) {
		result = `\x1b[2m${result}\x1b[22m`;
	}
	if (style.italic) {
		result = `\x1b[3m${result}\x1b[23m`;
	}
	if (style.underline) {
		result = `\x1b[4m${result}\x1b[24m`;
	}

	return result;
}

export const builtinClasses = Object.keys(DEFAULTS);

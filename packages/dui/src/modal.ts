/**
 * Overlay dialog primitive.
 *
 * Wraps `box()` with two conveniences specific to confirm-style dialogs:
 *
 * 1. **Title** and **content** share a single options object so callers
 *    don't have to manually compose the body's line list.
 * 2. **Buttons** (a footer action row) is composed automatically: each
 *    button is wrapped in `[ label ]` brackets, primary buttons are
 *    rendered with the `modal.buttonPrimary` theme color, and the
 *    footer line is centered inside the box's inner width. A divider
 *    line (`""`) is inserted between the body and the footer so the
 *    action row reads as visually distinct.
 *
 * Coloring happens **before** `box()` is invoked — every `[ label ]`
 * token is pre-painted, line-by-line, with the resolved primary or
 * secondary chip color. We deliberately avoid post-render string
 * replacement so:
 *
 *  - Duplicate button labels (`OK` + `OK`) each render correctly.
 *  - Body content that happens to literally contain `[ label ]` is
 *    never conflated with a real button token.
 *  - The modal is rendering-deterministic regardless of title/body
 *    collisions with the bracket pattern.
 *
 * `@bdocs/dui`'s `modal()` is non-interactive: it returns a static
 * rendered string. Interactive dialog flows should layer this string
 * under `select({ choices: buttons.map(b => ({ value: b.value, label: b.label })) })`.
 *
 * @example
 * modal({
 *   title: "Confirm",
 *   content: "Are you sure you want to delete this file?",
 *   buttons: [
 *     { label: "Cancel", value: "cancel" },
 *     { label: "Delete", value: "delete", primary: true },
 *   ],
 *   width: 50,
 * })
 */
import { box, type BoxBorderStyle, type BoxOptions } from "./box";
import { getConfig } from "./config";
import { resolveColor } from "./theme";
import type { ColorStyle } from "./theme";
import { padCenter } from "./utils";

export interface ModalButton {
	label: string;
	/** Returns value supplied to the consumer when this button is "pressed". */
	value?: string;
	/** Primary buttons get `modal.buttonPrimary` color, others get `buttonSecondary`. */
	primary?: boolean;
}

export interface ModalOptions {
	title?: string;
	content: string | string[];
	/** Total width including borders; defaults to `60`. */
	width?: number;
	buttons?: ModalButton[];
	style?: BoxBorderStyle;
	colors?: {
		border?: ColorStyle;
		title?: ColorStyle;
		buttonPrimary?: ColorStyle;
		buttonSecondary?: ColorStyle;
	};
}

/**
 * Build a single pre-painted `[ label ]` token. The brackets are kept
 * in the unstyled foreground so the row's visual rhythm stays consistent
 * regardless of fg/bg contrast; paint is applied only to the inner label.
 */
function buildButtonToken(
	label: string,
	paint: (s: string) => string,
	bg: ((s: string) => string) | undefined,
): string {
	const inner = paint(label);
	return `[ ${bg ? bg(inner) : inner} ]`;
}

/**
 * Compose the entire footer row string: pre-painted button tokens
 * joined with a 2-space gap, centered to `innerW` cells using
 * `padCenter` (which counts ANSI escapes at zero, so painted tokens
 * preserve their visible width).
 */
function buildButtonRow(
	buttons: ModalButton[],
	innerW: number,
	theme: ReturnType<typeof getConfig>["theme"],
	override: ModalOptions["colors"],
): string {
	const tokens = buttons.map((btn) => {
		const slot = btn.primary
			? "modal.buttonPrimary"
			: "modal.buttonSecondary";
		const colorOverride = btn.primary
			? override?.buttonPrimary
			: override?.buttonSecondary;
		const { apply, bg } = resolveColor(slot, theme, colorOverride);
		return buildButtonToken(btn.label, apply, bg);
	});
	return padCenter(tokens.join("  "), innerW);
}

export function modal(opts: ModalOptions): string {
	const theme = getConfig().theme;
	const width = opts.width ?? 60;
	const style = opts.style ?? "round";

	const contentLines = Array.isArray(opts.content)
		? opts.content.filter((l) => l.length > 0)
		: [opts.content];

	const allLines: string[] = [...contentLines];

	if (opts.buttons && opts.buttons.length > 0) {
		// Visual separator keeps the action row distinct from the body
		// content without depending on a custom-border box variant.
		allLines.push("");
		const innerWidth = Math.max(4, width - 2); // subtract left/right border
		allLines.push(buildButtonRow(opts.buttons, innerWidth, theme, opts.colors));
	}

	const boxColors: BoxOptions["colors"] = {
		border: opts.colors?.border,
		title: opts.colors?.title,
	};

	return box(allLines, {
		title: opts.title,
		width,
		style,
		padding: 1,
		colors: boxColors,
	});
}


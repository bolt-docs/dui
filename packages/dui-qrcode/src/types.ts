/**
 * Shared types for `@dui-toolkit/plugin-qrcode`.
 */

/**
 * Reed-Solomon error correction levels supported by the QR spec.
 * - `L` ≈ 7% recovery
 * - `M` ≈ 15% recovery (default)
 * - `Q` ≈ 25% recovery
 * - `H` ≈ 30% recovery
 */
export type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";

export interface QRCodeRenderOptions {
	/**
	 * Target render width in terminal columns. The renderer prefers
	 * the natural size — `2 × moduleCount` cols (square modules via
	 * `██`/`  `). If `width` is set AND smaller than `2 × moduleCount`,
	 * the renderer switches to single-char modules (`█`/` `),
	 * halving the rendered width. If `width` is even smaller (below
	 * `moduleCount`), the renderer clamps back to natural — QR data
	 * can't be subsampled without breaking scanner reliability.
	 */
	width?: number;
	/**
	 * Error correction level. Default: `"M"`.
	 */
	errorCorrection?: ErrorCorrectionLevel;
	/**
	 * Foreground color for dark modules. Accepts any DUI color format:
	 * hex (`#22c55e`, `#f00`), `rgb()`, `rgba()`, or `oklch()`.
	 * Default: `"#000000"`.
	 */
	color?: string;
	/**
	 * Background color for light modules. When omitted, light modules
	 * inherit the terminal's default background (transparent in practice).
	 * When provided, the renderer emits a per-line background SGR scoped
	 * so that no `\n` in the body ever fires with an active bg — that is
	 * the fix for the BCE-band bug. Same color formats as `color`.
	 */
	bgColor?: string;
	/**
	 * Quiet zone in modules around the QR matrix. Default: `2` (the spec
	 * minimum — recommended for scan reliability). Set to `0` to disable
	 * the quiet zone entirely; the rendered QR will hug its data modules,
	 * which helps composability inside tight `box()` / `table()` layouts
	 * but hurts scanner reliability when the surrounding background
	 * isn't uniform.
	 */
	margin?: number;
	/**
	 * Label line below the QR:
	 * - `true` (default) — dimmed encoded text, truncated to 40 chars
	 * - `false` — no label
	 * - `string` — custom label text (not truncated)
	 *
	 * Ignored when `showVersion` is `true` (version tag takes precedence
	 * if a label is shown at all — pass `label: false` to suppress).
	 */
	label?: boolean | string;
	/**
	 * When `true`, replace the label text with `QR v<n> | <errorCorrection>`.
	 * Useful for diagnostic / CI dumps. Requires a label to be shown
	 * (`label` not `false`). Default: `false`.
	 */
	showVersion?: boolean;
}

/**
 * Block-art banner painted as boxes on an exact CSS grid.
 *
 * Why not just render the ASCII art in a `<pre>`?
 *
 * 1. `█` (U+2588) does not fill its advance width — every monospace font
 *    leaves ~1px of slack, so a run of blocks shows a hairline lighter line
 *    at each cell boundary. Measured at 48px/2x: `rgb(63,201,114)` blocks
 *    separated by `rgb(68,202,118)`, and the seam survives at every font size
 *    from 20px to 64px, integral or fractional, so it can't be tuned away.
 * 2. `╔ ═ ╗ ║ ╚ ╝` are drawn inset to 25%/75% of the cell, so ANSI Shadow art
 *    that mixes them with `█` never lines up with the block edges — the thin
 *    accents read as offset no matter which monospace font is used.
 *
 * Painting every cell as a box removes both problems: the grid is exact by
 * construction and identical on every platform. Only `█` and space are
 * supported, so generate the art with `banner(text, { fill: '█' })` — and pass
 * `gap: ' '` so adjacent glyphs don't fuse into one blob.
 *
 * Cell size comes from `--banner-cell-h` (see index.css), so the banner scales
 * with the viewport without any font metrics involved.
 */

interface BlockBannerProps {
	/** Block art — one string per row, `█` for ink, space for background. */
	art: string;
	/** Read out instead of the art, e.g. `"DUI"`. */
	label: string;
	className?: string;
}

export default function BlockBanner({
	art,
	label,
	className,
}: BlockBannerProps) {
	const rows = art.split("\n");
	const cols = Math.max(...rows.map((row) => [...row].length));
	const cells = rows.flatMap((row) =>
		[...row.padEnd(cols, " ")].map((cell) => cell === "█"),
	);

	return (
		<div className={className}>
			{/* Real text for screen readers and copy/paste. */}
			<span className="sr-only">{label}</span>
			<div
				aria-hidden="true"
				className="block-banner"
				style={{
					gridTemplateColumns: `repeat(${cols}, var(--banner-cell-w))`,
					gridTemplateRows: `repeat(${rows.length}, var(--banner-cell-h))`,
				}}
			>
				{cells.map((on, i) => {
					// biome-ignore lint/suspicious/noArrayIndexKey: fixed grid, cells never reorder
					return <span key={i} data-on={on ? "1" : "0"} />;
				})}
			</div>
		</div>
	);
}

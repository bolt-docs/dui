/**
 * LazyTerminalPreview — wraps TerminalPreview with IntersectionObserver
 * so the demo content only renders when the component scrolls into view.
 *
 * While off-screen, a skeleton placeholder is shown that matches the
 * TerminalPreview shape: a thin top bar and pulsing content lines.
 *
 * @example
 * ```tsx
 * <LazyTerminalPreview title="dui — progress" command="node demo.js">
 *   {ansiContent}
 * </LazyTerminalPreview>
 * ```
 */

import { useRef } from "react";
import { useInViewport } from "../../hooks/useInViewport";
import TerminalPreview, { type TerminalPreviewProps } from "./TerminalPreview";

/* ── Skeleton component ──────────────────────────────────────── */

function SkeletonPlaceholder({
	title,
	command,
	minHeight = 160,
}: {
	title: string;
	command?: string;
	minHeight?: number;
}) {
	// Generate stable pseudo-random line widths so the skeleton looks
	// organic but doesn't flicker on re-render from SSR hydration.
	const lineWidths = useRef<number[]>([]);
	if (lineWidths.current.length === 0) {
		const widths = [72, 55, 83, 41, 68, 30, 91, 60];
		const count = Math.max(3, Math.floor(minHeight / 28));
		for (let i = 0; i < count; i++) {
			lineWidths.current.push(widths[i % widths.length]);
		}
	}

	return (
		<div
			className="my-6 overflow-hidden rounded-none border border-strong bg-white dark:bg-main font-mono text-xs sm:text-sm animate-pulse"
			role="status"
			aria-label={`Loading ${title} demo`}
		>
			{/* Terminal Top Bar skeleton */}
			<div className="flex items-center border-b border-strong/60 bg-[var(--term-bar-bg,#f4f4f4)] dark:bg-[var(--term-bar-bg-dark,#1a1a1a)] px-4 py-2 select-none">
				<div className="h-3 w-20 rounded bg-neutral-300 dark:bg-neutral-700" />
			</div>

			{/* Terminal Screen skeleton */}
			<div
				className="p-4 flex flex-col gap-3 overflow-hidden"
				style={{ minHeight }}
			>
				{/* Command line skeleton */}
				{command && (
					<div className="flex items-center gap-1.5 mb-1">
						<span className="h-3 w-3 rounded bg-green-600/30 dark:bg-green-500/30" />
						<div className="h-3 w-48 rounded bg-neutral-300 dark:bg-neutral-700" />
					</div>
				)}

				{/* Content lines skeleton */}
				{lineWidths.current.map((widthPct, i) => (
					<div
						key={i}
						className="h-3 rounded bg-neutral-300/70 dark:bg-neutral-700/60"
						style={{ width: `${widthPct}%` }}
					/>
				))}

				{/* Spacer lines to fill remaining space */}
				<div
					className="h-3 w-24 rounded bg-neutral-300/40 dark:bg-neutral-700/30"
				/>
				<div
					className="h-3 w-56 rounded bg-neutral-300/40 dark:bg-neutral-700/30"
				/>

				{/* Accessibility text — hidden visually */}
				<span className="sr-only">Loading...</span>
			</div>
		</div>
	);
}

/* ── Lazy wrapper ────────────────────────────────────────────── */

export interface LazyTerminalPreviewProps extends TerminalPreviewProps {
	/** Minimum height of the skeleton placeholder in pixels. Default: 160. */
	skeletonMinHeight?: number;
	/**
	 * IntersectionObserver rootMargin. Loading starts this distance
	 * before the element enters the viewport. Default: `"200px"`.
	 */
	rootMargin?: string;
	/**
	 * Delay in ms before rendering after the element becomes visible.
	 * Prevents a flash of content during fast scrolling. Default: `100`.
	 */
	renderDelay?: number;
}

export default function LazyTerminalPreview({
	skeletonMinHeight = 160,
	rootMargin = "200px",
	renderDelay = 100,
	title,
	command,
	lines,
	children,
	screenClassName,
}: LazyTerminalPreviewProps) {
	const { ref, shouldRender } = useInViewport({ rootMargin, renderDelay });

	if (shouldRender) {
		return (
			<TerminalPreview
				title={title}
				command={command}
				lines={lines}
				screenClassName={screenClassName}
			>
				{children}
			</TerminalPreview>
		);
	}

	return (
		<div
			ref={ref}
			style={{
				contentVisibility: "auto",
				containIntrinsicSize: `${skeletonMinHeight}px`,
			}}
		>
			<SkeletonPlaceholder
				title={title}
				command={command}
				minHeight={skeletonMinHeight}
			/>
		</div>
	);
}

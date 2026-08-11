/**
 * LazySection — wraps any content with IntersectionObserver-based
 * lazy rendering. Shows a skeleton placeholder while off-screen.
 *
 * Used on the homepage to defer rendering of the DuiShowcase carousel,
 * AnimatedTerminal, and other heavy components until they scroll
 * into view.
 */

import { type ReactNode } from "react";
import { useInViewport } from "../hooks/useInViewport";

/* ── Skeleton shapes ─────────────────────────────────────────── */

function SkeletonBar({ className = "" }: { className?: string }) {
	return (
		<div
			className={`h-4 rounded bg-neutral-300/60 dark:bg-neutral-700/50 animate-pulse ${className}`}
		/>
	);
}

function SkeletonBox({
	className = "",
	children,
}: { className?: string; children?: ReactNode }) {
	return (
		<div
			className={`rounded-none border border-strong bg-white/30 dark:bg-black/20 animate-pulse ${className}`}
		>
			{children}
		</div>
	);
}

function SkeletonText({ lines = 4 }: { lines?: number }) {
	const widths = [72, 55, 83, 41, 68, 30, 91, 60];
	return (
		<div className="flex flex-col gap-3">
			{Array.from({ length: lines }, (_, i) => (
				<SkeletonBar
					key={i}
					className="h-3"
					style={{ width: `${widths[i % widths.length]}%` }}
				/>
			))}
		</div>
	);
}

/* ── Section shapes ──────────────────────────────────────────── */

export type LazySectionShape =
	| "card"
	| "text"
	| "terminal-big"
	| "terminal-small"
	| "carousel"
	| "grid-3";

function ShapeSkeleton({ shape }: { shape: LazySectionShape }) {
	switch (shape) {
		case "card":
			return (
				<div className="flex flex-col gap-3 p-6">
					<SkeletonBar className="w-1/3 h-5" />
					<SkeletonText lines={3} />
				</div>
			);
		case "text":
			return (
				<div className="flex flex-col gap-3 p-4">
					<SkeletonBar className="w-1/4 h-5" />
					<SkeletonText lines={4} />
				</div>
			);
		case "terminal-small":
			return (
				<div className="flex flex-col gap-0 rounded-none border border-strong overflow-hidden">
					<div className="h-9 bg-neutral-200/60 dark:bg-neutral-800/60 border-b border-strong" />
					<div className="p-4 flex flex-col gap-3">
						<SkeletonText lines={3} />
					</div>
				</div>
			);
		case "terminal-big":
			return (
				<div className="flex flex-col gap-0 rounded-none border border-strong overflow-hidden">
					<div className="h-10 bg-neutral-200/60 dark:bg-neutral-800/60 border-b border-strong" />
					<div className="p-6 flex flex-col gap-3 min-h-[340px]">
						<SkeletonBar className="w-1/3 h-3" />
						<SkeletonText lines={8} />
					</div>
				</div>
			);
		case "carousel":
			return (
				<div className="flex flex-col gap-4">
					<div className="rounded-none border border-strong overflow-hidden min-h-[400px]">
						<div className="p-6 flex flex-col gap-4">
							<SkeletonBar className="w-1/4 h-4" />
							<SkeletonBox className="flex-1 min-h-[280px]" />
							<div className="flex gap-2 justify-center">
								{[1, 2, 3, 4, 5].map((i) => (
									<div
										key={i}
										className="h-2 w-2 rounded-full bg-neutral-300/60 dark:bg-neutral-700/50"
									/>
								))}
							</div>
						</div>
					</div>
				</div>
			);
		case "grid-3":
			return (
				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
					{[1, 2, 3].map((i) => (
						<SkeletonBox key={i} className="min-h-[120px] p-4">
							<div className="flex flex-col gap-2">
								<SkeletonBar className="w-2/3 h-4" />
								<SkeletonText lines={2} />
							</div>
						</SkeletonBox>
					))}
				</div>
			);
	}
}

/* ── LazySection component ───────────────────────────────────── */

export interface LazySectionProps {
	/**
	 * Content to render when visible.
	 */
	children: ReactNode;
	/**
	 * Visual shape of the skeleton placeholder.
	 */
	shape?: LazySectionShape;
	/**
	 * IntersectionObserver rootMargin. Default: `"200px"`.
	 */
	rootMargin?: string;
	/**
	 * Delay before rendering after becoming visible (ms). Default: `50`.
	 */
	renderDelay?: number;
	/**
	 * Minimum height to reserve while loading.
	 */
	minHeight?: number | string;
	/**
	 * Optional class name.
	 */
	className?: string;
}

export default function LazySection({
	children,
	shape = "terminal-big",
	rootMargin = "200px",
	renderDelay = 50,
	minHeight,
	className = "",
}: LazySectionProps) {
	const { ref, shouldRender } = useInViewport({ rootMargin, renderDelay });

	if (shouldRender) {
		return <>{children}</>;
	}

	return (
		<div
			ref={ref}
			className={className}
			style={{
				contentVisibility: "auto",
				containIntrinsicSize: minHeight ?? (shape === "carousel" ? "420px" : "200px"),
				minHeight: minHeight ?? (shape === "carousel" ? "420px" : "200px"),
			}}
			role="status"
			aria-label="Loading section"
		>
			<ShapeSkeleton shape={shape} />
		</div>
	);
}

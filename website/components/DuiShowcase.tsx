import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	AnimationDemo,
	BoxesDemo,
	ChartDemo,
	ColorsDemo,
	ConfirmPromptDemo,
	DiffDemo,
	GridDemo,
	ImageDemo,
	ListsDemo,
	LoggerDemo,
	NotifyDemo,
	ProgressBarDemo,
	QrCodeDemo,
	SpinnerDemo,
	StepsDemo,
	TableDemo,
} from "./ShowcasePreviews";

const CROSSFADE_MS = 250;

/* ── Demo metadata (no JSX — avoids mounting all 13 at once) ── */

interface ShowcaseMeta {
	id: string;
	demoFactory: () => React.ReactNode;
	title: string;
	tag: string;
	desc: string;
}

const ITEMS: ShowcaseMeta[] = [
	{
		id: "progress",
		demoFactory: () => <ProgressBarDemo />,
		title: "ProgressBar",
		tag: "core",
		desc: "Dynamic progress indicator for long-running CLI tasks. Automatically adjusts to terminal width.",
	},
	{
		id: "colors",
		demoFactory: () => <ColorsDemo />,
		title: "Colors Engine",
		tag: "core",
		desc: "24-bit True Color engine with HEX, RGB, RGBA, and OKLCH support. Interpolate colors for terminal gradients.",
	},
	{
		id: "spinner",
		demoFactory: () => <SpinnerDemo />,
		title: "Spinners",
		tag: "core",
		desc: "Animated braille-frame spinners with non-blocking operation and clean status indicators.",
	},
	{
		id: "steps",
		demoFactory: () => <StepsDemo />,
		title: "Step Timelines",
		tag: "core",
		desc: "Pipeline timelines with connection lines and colored status icons — pending, running, success, error.",
	},
	{
		id: "table",
		demoFactory: () => <TableDemo />,
		title: "Table & Layout",
		tag: "core",
		desc: "Box-drawing character tables with column alignment, custom padding, and ANSI-aware wrapping.",
	},
	{
		id: "boxes",
		demoFactory: () => <BoxesDemo />,
		title: "Boxes & Borders",
		tag: "core",
		desc: "Box builder with double, single, and round border styles for structured terminal output.",
	},
	{
		id: "lists",
		demoFactory: () => <ListsDemo />,
		title: "Lists & Tasks",
		tag: "core",
		desc: "Bullet points, numbered lists, and task checklists with ANSI-aware alignment.",
	},
	{
		id: "logger",
		demoFactory: () => <LoggerDemo />,
		title: "Logger",
		tag: "core",
		desc: "Structured logging — info, warn, error, success, debug — with configurable prefixes and styled output.",
	},
	{
		id: "prompts",
		demoFactory: () => <ConfirmPromptDemo />,
		title: "Prompts",
		tag: "interactive",
		desc: "Interactive confirm prompts with default values, styled messages, and SIGINT handling.",
	},
	{
		id: "animation",
		demoFactory: () => <AnimationDemo />,
		title: "Animation",
		tag: "advanced",
		desc: "25+ easing functions, spring physics, keyframe timelines, and progress-driven animations.",
	},
	{
		id: "chart",
		demoFactory: () => <ChartDemo />,
		title: "Charts",
		tag: "plugin",
		desc: "Bar, column, line, pie, and sparkline charts for your terminal. 24-bit true color with auto-scaling and stacked series support.",
	},
	{
		id: "diff",
		demoFactory: () => <DiffDemo />,
		title: "Diff",
		tag: "plugin",
		desc: "Unified, side-by-side, and word-level diff rendering with multi-file aggregation and themeing.",
	},
	{
		id: "grid",
		demoFactory: () => <GridDemo />,
		title: "Grid & Layout",
		tag: "core",
		desc: "Grid, section, divider, and badge components for composing complex terminal layouts.",
	},
	{
		id: "qrcode",
		demoFactory: () => <QrCodeDemo />,
		title: "QR Code",
		tag: "plugin",
		desc: "Scannable QR codes in the terminal with custom colors, width cap, labels, and error correction.",
	},
	{
		id: "notify",
		demoFactory: () => <NotifyDemo />,
		title: "Notify",
		tag: "plugin",
		desc: "Cross-platform desktop notifications — osascript, notify-send, powershell, and OSC 99 terminal toasts — behind one unified notify() API.",
	},
	{
		id: "image",
		demoFactory: () => <ImageDemo />,
		title: "Image Rendering",
		tag: "plugin",
		desc: "ANSI image renderer using 4-shade dither (░▒▓█) with 24-bit true color and kitty/iterm2 protocol support.",
	},
];

const TAG_COLORS: Record<string, string> = {
	core: "bg-[#6c5ce7]/20 text-[#a29bfe] border-[#6c5ce7]/30",
	interactive: "bg-[#00d4aa]/20 text-[#00d4aa] border-[#00d4aa]/30",
	advanced: "bg-[#ff6b6b]/20 text-[#ff6b6b] border-[#ff6b6b]/30",
	plugin: "bg-[#48dbfb]/20 text-[#48dbfb] border-[#48dbfb]/30",
};

/* ── Swipe gesture helpers ─────────────────────────────────── */

interface SwipeState {
	startX: number;
	startY: number;
	lastX: number;
	lastY: number;
	isSwiping: boolean;
}

/**
 * Returns pointer-event handlers for detecting horizontal swipes.
 * Only triggers navigation when the horizontal displacement exceeds
 * SWIPE_THRESHOLD(50px) AND is at least 2× the vertical displacement
 * (so vertical scrolling isn't mistaken for a swipe).
 */
function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
	const SWIPE_THRESHOLD = 50;
	const state = useRef<SwipeState | null>(null);

	const handlers = useMemo(
		() => ({
			onPointerDown: (e: React.PointerEvent) => {
				state.current = {
					startX: e.clientX,
					startY: e.clientY,
					lastX: e.clientX,
					lastY: e.clientY,
					isSwiping: true,
				};
			},
			onPointerMove: (e: React.PointerEvent) => {
				if (!state.current?.isSwiping) return;
				state.current.lastX = e.clientX;
				state.current.lastY = e.clientY;
			},
			onPointerUp: () => {
				const s = state.current;
				if (!s?.isSwiping) return;
				state.current = null;

				const dx = s.lastX - s.startX;
				const dy = Math.abs(s.lastY - s.startY);
				// Only horizontal swipes where horizontal ≫ vertical movement
				if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < dy * 2) return;

				if (dx > 0) onSwipeRight();
				else onSwipeLeft();
			},
			onPointerCancel: () => {
				state.current = null;
			},
		}),
		[onSwipeLeft, onSwipeRight],
	);

	return handlers;
}

/* ── Lazy render cache ─────────────────────────────────────── */

function wrapId(id: string) {
	return `dui-demo-${id}`;
}

/**
 * Ensures the current, previous, and next demos are materialized.
 * Non-visible demos are never created until the user navigates to them.
 */
function useDemoCache(currentIndex: number, items: ShowcaseMeta[]) {
	const cache = useRef<Map<string, React.ReactNode>>(new Map());

	const get = useCallback((meta: ShowcaseMeta): React.ReactNode => {
		const key = wrapId(meta.id);
		let node = cache.current.get(key);
		if (!node) {
			node = meta.demoFactory();
			cache.current.set(key, node);
		}
		return node;
	}, []);

	// Pre-cache the neighbours of the current index so they're ready
	// for instant crossfade — only 3 demos are ever mounted at once.
	useEffect(() => {
		const len = items.length;
		const prevIdx = ((currentIndex - 1) % len + len) % len;
		const nextIdx = ((currentIndex + 1) % len + len) % len;
		// Calling get() materializes + caches each if missing
		get(items[currentIndex]);
		get(items[prevIdx]);
		get(items[nextIdx]);
	}, [currentIndex, get, items]);

	return get;
}

/* ── Reusable SVG icon components ─────────────────────────── */

function ChevronLeft() {
	return (
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<polyline points="15 18 9 12 15 6" />
		</svg>
	);
}

function ChevronRight() {
	return (
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<polyline points="9 18 15 12 9 6" />
		</svg>
	);
}

function PlayIcon() {
	return (
		<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
			<polygon points="5 3 19 12 5 21 5 3" />
		</svg>
	);
}

function PauseIcon() {
	return (
		<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
			<rect x="6" y="4" width="4" height="16" />
			<rect x="14" y="4" width="4" height="16" />
		</svg>
	);
}

/* ── Shared button classes ─────────────────────────────────── */

const NAV_BUTTON =
	"flex items-center justify-center w-8 h-8 rounded-lg border border-strong text-muted hover:text-body hover:bg-soft hover:border-terminal-green/50 hover:text-terminal-green transition-all duration-150 cursor-pointer";

const PAUSE_BUTTON =
	"flex items-center justify-center w-7 h-7 rounded border border-strong text-muted hover:text-body hover:bg-soft transition-all duration-150 cursor-pointer";

/* ── URL query param filter ────────────────────────────────── */

/**
 * Reads the `?plugins=` query param from the URL and returns a list of
 * demo IDs to show. Returns `undefined` when the param is absent so the
 * caller can fall back to its own default.
 *
 * Example: `?plugins=diff,image` → `["diff","image"]`
 */
function useQueryPluginFilter(): string[] | undefined {
	// Re-read URL on every render so client-side navigation (e.g. React
	// Router) is picked up automatically without extra subscriptions.
	return useMemo(() => {
		if (typeof window === "undefined") return undefined;
		const params = new URLSearchParams(window.location.search);
		const raw = params.get("plugins");
		if (!raw || !raw.trim()) return undefined;
		const ids = raw
			.split(",")
			.map((id) => id.trim())
			.filter(Boolean);
		return ids.length > 0 ? ids : undefined;
	}, [typeof window !== "undefined" ? window.location.search : ""]);
}

/* ── Component ─────────────────────────────────────────────── */

interface DuiShowcaseProps {
	/** Only show demos with these IDs. Omit to show all demos. */
	allowedIds?: string[];
}
	export default function DuiShowcase({ allowedIds }: DuiShowcaseProps) {
	// URL query param (`?plugins=`) takes priority over the prop.
	// If the param specifies IDs that don't exist, fall back to all items.
	const urlPluginFilter = useQueryPluginFilter();
	const effectiveIds = urlPluginFilter ?? allowedIds;

	const items = useMemo(
		() => {
			if (!effectiveIds) return ITEMS;
			const filtered = ITEMS.filter((item) => effectiveIds.includes(item.id));
			// Guard against entirely invalid query — show all instead of empty
			return filtered.length > 0 ? filtered : ITEMS;
		},
		[effectiveIds],
	);

	const [currentIndex, setCurrentIndex] = useState(0);
	const [isPaused, setIsPaused] = useState(false);
	const [isTransitioning, setIsTransitioning] = useState(false);
	const [prevMeta, setPrevMeta] = useState<ShowcaseMeta | null>(null);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const cachedDemo = useDemoCache(currentIndex, items);

	const current = items[currentIndex];

	const goTo = useCallback((index: number) => {
		const len = items.length;
		const newIndex = ((index % len) + len) % len;
		if (newIndex === currentIndex) return;
		setPrevMeta(items[currentIndex]);
		setCurrentIndex(newIndex);
	}, [currentIndex, items]);

	const goNext = useCallback(() => {
		goTo(currentIndex + 1);
	}, [currentIndex, goTo]);

	const goPrev = useCallback(() => {
		goTo(currentIndex - 1);
	}, [currentIndex, goTo]);

	const swipeHandlers = useSwipe(goNext, goPrev);

	// Auto-play
	useEffect(() => {
		if (isPaused) {
			if (intervalRef.current) clearInterval(intervalRef.current);
			return;
		}
		intervalRef.current = setInterval(goNext, 4000);
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [isPaused, goNext]);

	// Start transition when currentIndex changes; resets if user navigates during one
	useEffect(() => {
		if (transitionTimer.current) clearTimeout(transitionTimer.current);

		// Only start a timer if prevMeta is set (meaning goTo triggered it)
		if (!prevMeta) return;

		setIsTransitioning(true);

		transitionTimer.current = setTimeout(() => {
			setIsTransitioning(false);
			setPrevMeta(null);
		}, CROSSFADE_MS);

		return () => {
			if (transitionTimer.current) clearTimeout(transitionTimer.current);
		};
	}, [currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

	return (
		<div
			className="relative w-full dui-showcase"
			style={{ contentVisibility: "auto", containIntrinsicSize: "480px" }}
			onMouseEnter={() => setIsPaused(true)}
			onMouseLeave={() => setIsPaused(false)}
			onFocus={() => setIsPaused(true)}
			onBlur={() => setIsPaused(false)}
		>
			{/* Carousel Stage */}
			<div
				className="relative overflow-hidden rounded-xl border border-strong bg-white/5 touch-pan-y select-none"
				{...swipeHandlers}
			>
				{/* Demo slot with stable height */}
				<div className="relative min-h-[340px]">
					{/* Exiting demo — fades out */}
					{prevMeta && isTransitioning && (
						<div
							key={`exit-${prevMeta.id}`}
							className="absolute inset-0 overflow-y-auto showcase-fade-out pointer-events-none"
						>
							{cachedDemo(prevMeta)}
						</div>
					)}

					{/* Entering demo — fades in */}
					<div
						key={current.id}
						className={`absolute inset-0 overflow-y-auto ${
							isTransitioning ? "showcase-fade-in" : ""
						}`}
					>
						{cachedDemo(current)}
					</div>
				</div>

				{/* Overlay info bar */}
				<div className="border-t border-strong bg-soft/80 backdrop-blur-sm px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
					<div className="flex items-center gap-3">
						<span
							className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${TAG_COLORS[current.tag] || TAG_COLORS.core}`}
						>
							{current.tag}
						</span>
						<h3 className="text-sm font-bold text-body">
							<span className="text-terminal-green">/</span> {current.title}
						</h3>
					</div>
					<p className="text-xs text-muted leading-relaxed max-w-md">
						{current.desc}
					</p>
				</div>
			</div>

			{/* Navigation Controls */}
			<div className="flex items-center justify-between mt-4">
				<div className="flex items-center gap-2">
					{/* Prev Button */}
					<button
						type="button"
						onClick={goPrev}
						className={NAV_BUTTON}
						aria-label="Previous widget"
					>
						<ChevronLeft />
					</button>

					{/* Dots */}
					<div className="flex items-center gap-1.5">
						{items.map((item, idx) => (
							<button
								key={item.id}
								type="button"
								onClick={() => goTo(idx)}
								className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
									idx === currentIndex
										? "w-6 bg-terminal-green"
										: "w-1.5 bg-strong hover:bg-muted"
								}`}
								aria-label={`Go to ${item.title}`}
							/>
						))}
					</div>

					{/* Next Button */}
					<button
						type="button"
						onClick={goNext}
						className={NAV_BUTTON}
						aria-label="Next widget"
					>
						<ChevronRight />
					</button>
				</div>

				{/* Counter + Pause */}
				<div className="flex items-center gap-3">
					<span className="text-[11px] font-mono text-dim tabular-nums">
						{String(currentIndex + 1).padStart(2, "0")} /{" "}
						{String(items.length).padStart(2, "0")}
					</span>
					<button
						type="button"
						onClick={() => setIsPaused((p) => !p)}
						className={PAUSE_BUTTON}
						aria-label={isPaused ? "Resume auto-play" : "Pause auto-play"}
					>
						{isPaused ? <PlayIcon /> : <PauseIcon />}
					</button>
				</div>
			</div>
		</div>
	);
}

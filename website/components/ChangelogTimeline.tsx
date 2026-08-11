/**
 * ChangelogTimeline — modern vertical release timeline with terminal-style
 * nodes, in the shape of a day-by-day changelog (date line + bullets).
 *
 * Usage in MDX:
 *
 *   <ChangelogTimeline>
 *     <ChangelogTimelineItem version="v0.6.0" tag="Next" date="next release">
 *       - [`badge()`](/docs/v0.6.0/api/badge) — status chips
 *     </ChangelogTimelineItem>
 *     <ChangelogTimelineItem version="v0.5.0" date="current stable">
 *       - ...
 *     </ChangelogTimelineItem>
 *   </ChangelogTimeline>
 */

"use client";

import {
	Children,
	isValidElement,
	type ReactElement,
	type ReactNode,
} from "react";

export interface ChangelogTimelineItemProps {
	version: string;
	tag?: string;
	date?: string;
	children: ReactNode;
}

export function ChangelogTimelineItem({
	children,
}: ChangelogTimelineItemProps) {
	return <>{children}</>;
}

interface ChangelogTimelineProps {
	children: ReactNode;
	className?: string;
}

export default function ChangelogTimeline({
	children,
	className = "",
}: ChangelogTimelineProps) {
	const items = Children.toArray(children).filter(
		(child): child is ReactElement<ChangelogTimelineItemProps> =>
			isValidElement<ChangelogTimelineItemProps>(child) &&
			child.type === ChangelogTimelineItem,
	);

	if (items.length === 0) return null;

	return (
		<div className={`my-10 ${className}`}>
			{items.map((item, i) => {
				const isLast = i === items.length - 1;
				return (
					<div key={i} className="relative pl-9 pb-12 last:pb-0">
						{/* vertical rail connecting nodes */}
						{!isLast && (
							<span
								aria-hidden="true"
								className="absolute left-[7px] top-4 bottom-0 w-px bg-gradient-to-b from-terminal-green/50 via-terminal-green/25 to-transparent"
							/>
						)}
						{/* version node with glow */}
						<span
							aria-hidden="true"
							className="absolute left-0 top-3 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-terminal-green bg-main shadow-[0_0_10px_rgba(63,201,114,0.45)]"
						>
							<span className="h-1.5 w-1.5 rounded-full bg-terminal-green" />
						</span>

						{/* date line (Freebuff-style) */}
						{item.props.date && (
							<p className="mb-1 font-mono text-[11px] uppercase tracking-[0.18em] text-dim">
								{item.props.date}
							</p>
						)}

						{/* version + tag */}
						<div className="mb-4 flex flex-wrap items-baseline gap-2.5">
							<span className="font-mono text-base font-bold text-body">
								{item.props.version}
							</span>
							{item.props.tag && (
								<span className="border border-terminal-green/50 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-terminal-green">
									{item.props.tag}
								</span>
							)}
						</div>

						{/* content */}
						<div className="text-sm leading-relaxed">
							{item.props.children}
						</div>
					</div>
				);
			})}
		</div>
	);
}

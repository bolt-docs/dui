interface CalloutProps {
	variant: "warning" | "note" | "info";
	children: React.ReactNode;
}

const CONFIG = {
	warning: {
		icon: "⚠",
		label: "WARNING",
		color: "#facc15",
	},
	note: {
		icon: "ℹ",
		label: "NOTE",
		color: "#60a5fa",
	},
	info: {
		icon: "●",
		label: "INFO",
		color: "#4ade80",
	},
} as const;

export default function Callout({ variant, children }: CalloutProps) {
	const cfg = CONFIG[variant];

	return (
		<div
			className="my-6 border border-strong text-sm rounded-none overflow-hidden"
			role={variant === "warning" ? "alert" : undefined}
		>
			<div className="flex items-center gap-2 border-b border-strong dark:bg-neutral-950/60 bg-neutral-50/80 px-4 py-2">
				<span className="text-sm" style={{ color: cfg.color }} aria-hidden="true">
					{cfg.icon}
				</span>
				<span
					className="text-[10px] font-semibold uppercase tracking-[0.15em] select-none font-sans"
					style={{ color: cfg.color }}
				>
					{cfg.label}
				</span>
			</div>
			<div className="dark:bg-neutral-950/40 bg-neutral-50/60 px-4 py-3 leading-relaxed [&>code]:text-terminal-yellow [&>code]:text-xs">
				{children}
			</div>
		</div>
	);
}

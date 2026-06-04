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
		<div className="my-6 border border-strong font-mono text-sm">
			<div className="flex items-center gap-2 border-b border-strong dark:bg-neutral-950 bg-neutral-50 px-3 py-1.5">
				<span className="text-xs" style={{ color: cfg.color }}>
					{cfg.icon}
				</span>
				<span
					className="text-[10px] font-semibold uppercase tracking-[0.15em] select-none"
					style={{ color: cfg.color }}
				>
					{cfg.label}
				</span>
			</div>
			<div className="dark:bg-neutral-950 bg-neutral-50 px-3 py-2.5 dark:opacity-80 opacity-85 leading-relaxed [&>code]:text-terminal-yellow [&>code]:text-xs">
				{children}
			</div>
		</div>
	);
}

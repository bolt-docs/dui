interface FieldProps {
	name: string;
	type: string;
	default?: string;
	deprecated?: boolean;
	children: React.ReactNode;
}

export default function Field({
	name,
	type,
	default: defaultValue,
	deprecated,
	children,
}: FieldProps) {
	return (
		<div className="my-3 font-mono text-sm">
			<div className="flex items-baseline gap-1.5 flex-wrap">
				<span className="text-terminal-green select-none text-xs">●</span>
				<span className="dark:text-[#e5e5e5] font-medium">{name}</span>
				<span className="text-muted">:</span>
				<span className="text-terminal-cyan">{type}</span>
				{defaultValue !== undefined && (
					<>
						<span className="text-muted">=</span>
						<span className="text-terminal-yellow">{defaultValue}</span>
					</>
				)}
				{deprecated && (
					<span className="text-terminal-red text-[10px] uppercase tracking-wider font-semibold ml-1">
						Deprecated
					</span>
				)}
			</div>
			<div className="ml-4 mt-0.5 text-muted leading-relaxed">{children}</div>
		</div>
	);
}

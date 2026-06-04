import { useBreadcrumbs } from "boltdocs/client";
import { Breadcrumbs } from "boltdocs/primitives";

export function TerminalBreadcrumbs() {
	const { crumbs, activeRoute } = useBreadcrumbs();

	if (crumbs.length === 0) return null;

	return (
		<div className="inline-flex items-center gap-2 border border-strong px-3 py-1.5 font-mono text-xs select-none">
			<span className="text-terminal-green font-bold">$</span>
			<Breadcrumbs.Root className="flex items-center gap-1">
				{crumbs.map((crumb, idx) => {
					return (
						<Breadcrumbs.Item
							key={`${crumb.href}-${idx}`}
							className="flex items-center gap-1"
						>
							{idx === 0 ? (
								<span className="text-muted">~/</span>
							) : (
								<span className="text-muted">/</span>
							)}
							{crumb.href === activeRoute?.path ? (
								<span className="font-medium">{crumb.label}</span>
							) : (
								<Breadcrumbs.Link
									href={crumb.href}
									className="text-muted hover:text-white transition-colors no-underline"
								>
									{crumb.label}
								</Breadcrumbs.Link>
							)}
						</Breadcrumbs.Item>
					);
				})}
			</Breadcrumbs.Root>
		</div>
	);
}

import { Link } from "boltdocs/primitives";
import type { ReactNode } from "react";

type CardProps = {
	href: string;
	title: string;
	icon?: ReactNode;
	children: ReactNode;
};

export function Card({ href, title, icon, children }: CardProps) {
	return (
		<Link
			href={href}
			className="group block border border-strong p-4 hover:border-terminal-green/50 hover:bg-terminal-green/5 transition-all duration-150"
		>
			<div className="flex items-center gap-2 mb-2">
				{icon ? (
					<span className="text-terminal-green w-4 h-4 flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4">
						{icon}
					</span>
				) : (
					<span className="text-terminal-green text-xs">$</span>
				)}
				<h3 className="text-sm font-semibold text-body group-hover:text-terminal-green transition-colors">
					{title}
					<span className="hidden group-hover:inline animate-pulse text-terminal-green ml-0.5">
						▌
					</span>
				</h3>
			</div>
			<div className="text-xs text-muted leading-relaxed">{children}</div>
		</Link>
	);
}

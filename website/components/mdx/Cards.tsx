import type { ReactNode } from "react";

type CardsProps = {
	cols?: number;
	children: ReactNode;
};

export function Cards({ cols = 2, children }: CardsProps) {
	return (
		<div
			className="grid gap-4 my-6"
			style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
		>
			{children}
		</div>
	);
}

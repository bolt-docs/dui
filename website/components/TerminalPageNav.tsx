import { PageNav } from "boltdocs/primitives";
import { usePageNav } from "boltdocs/client";

export function TerminalPageNav() {
	const { prevPage, nextPage } = usePageNav();

	if (!prevPage && !nextPage) return null;

	return (
		<PageNav.Root className="border-t border-strong pt-6 mt-12 gap-3 terminal-pagenav">
			{prevPage ? (
				<PageNav.Link
					to={prevPage.path}
					direction="prev"
					className="group border gap-2 hover:text-dim hover:cursor-pointer border-strong px-4 py-3 hover:bg-soft transition-none"
				>
					<PageNav.Title className="text-xs text-dim font-mono">
						prev
					</PageNav.Title>
					<PageNav.Description className="text-sm text-body mt-1 font-mono">
						{prevPage.title}
					</PageNav.Description>
				</PageNav.Link>
			) : (
				<div />
			)}

			{nextPage ? (
				<PageNav.Link
					to={nextPage.path}
					direction="next"
					className="group border gap-2 border-strong hover:cursor-pointer hover:text-dim px-4 py-3 hover:bg-soft transition-none text-right"
				>
					<PageNav.Title className="text-xs text-dim font-mono">
						next
					</PageNav.Title>
					<PageNav.Description className="text-sm text-body mt-1 font-mono">
						{nextPage.title}
					</PageNav.Description>
				</PageNav.Link>
			) : (
				<div />
			)}
		</PageNav.Root>
	);
}

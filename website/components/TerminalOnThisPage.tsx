import { useRef } from "react";
import {
	OnThisPage,
	AnchorProvider,
	ScrollProvider,
	useActiveAnchors,
	Link,
} from "boltdocs/primitives";
import {
	useRoutes,
	useConfig,
	type BoltdocsLocale,
	useI18n,
	cn,
} from "boltdocs/client";
import { Pencil } from "lucide-react";

interface ListProps {
	headings: any[];
}

function TerminalOnThisPageList({ headings }: ListProps) {
	const activeIds = useActiveAnchors();
	return (
		<OnThisPage.List className="relative flex flex-col gap-0.5">
			{headings.map((h) => {
				const active = activeIds.includes(h.id);
				return (
					<OnThisPage.Item key={h.id} level={h.level}>
						<OnThisPage.Link
							href={`#${h.id}`}
							active={active}
							className={cn(
								`block py-0.5! text-xs! font-mono transition-none before:font-mono before:mr-1.5`,
								{
									"text-terminal-green! font-medium before:content-['>'] before:text-terminal-green!":
										active,
									"text-muted hover:text-body! before:content-['·'] before:text-dim":
										!active,
								},
							)}
						>
							{h.text}
						</OnThisPage.Link>
					</OnThisPage.Item>
				);
			})}
		</OnThisPage.List>
	);
}

const localeOnthisPage: Record<BoltdocsLocale, Record<string, string>> = {
	es: {
		"on-this-page": "Índice de la página",
		"edit-this-page": "Editar esta página",
	},
	en: {
		"on-this-page": "On this page",
		"edit-this-page": "Edit this page",
	},
};

export function TerminalOnThisPage() {
	const { currentRoute } = useRoutes();
	const config = useConfig();
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const { currentLocale } = useI18n();

	const headings = currentRoute?.headings || [];
	if (headings.length === 0) return null;

	const tocItems = headings.map((h) => ({
		title: h.text,
		url: `#${h.id}`,
		depth: h.level,
	}));

	const { editLink } = config.theme || {};
	const filePath = currentRoute?.filePath;

	return (
		<OnThisPage className="border-l border-strong pl-4 py-6 bg-transparent font-mono text-xs text-muted sticky top-navbar h-[calc(100vh-var(--spacing-navbar))] overflow-y-auto">
			<div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-dim mb-4 select-none">
				# {localeOnthisPage[currentLocale ?? "en"]?.["on-this-page"]}
			</div>

			<AnchorProvider toc={tocItems} single={false}>
				<ScrollProvider containerRef={scrollContainerRef}>
					<OnThisPage.Content ref={scrollContainerRef} className="max-h-[70vh]">
						<TerminalOnThisPageList headings={headings} />
					</OnThisPage.Content>
				</ScrollProvider>
			</AnchorProvider>

			{editLink && filePath && (
				<div className="mt-6 pt-6 border-t border-strong">
					<Link
						href={editLink.replace(":path", filePath)}
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-1.5 text-[12px] font-mono text-muted hover:text-body transition-colors"
					>
						<Pencil size={12} className="text-dim" />
						{localeOnthisPage[currentLocale ?? "en"]?.["edit-this-page"]}
					</Link>
				</div>
			)}
		</OnThisPage>
	);
}

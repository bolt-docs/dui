import {
	DocsLayout,
	ErrorBoundary,
} from "boltdocs/primitives";
import { useRoutes } from "boltdocs/client";
import { TerminalNavbar } from "./TerminalNavbar";
import { TerminalSidebar } from "./TerminalSidebar";
import { TerminalPageNav } from "./TerminalPageNav";
import { TerminalBreadcrumbs } from "./TerminalBreadcrumbs";
import { TerminalCopyMarkdown } from "./TerminalCopyMarkdown";
import { TerminalOnThisPage } from "./TerminalOnThisPage";

interface LayoutProps {
	children?: React.ReactNode;
}

export default function TerminalLayout({ children }: LayoutProps) {
	const { currentRoute } = useRoutes();

	return (
		<DocsLayout>
			<TerminalNavbar />
			<DocsLayout.Body className="max-w-[88rem] mx-auto w-full bg-main h-full">
				<TerminalSidebar />

				<DocsLayout.Content className="scroll-smooth">
					<DocsLayout.ContentMdx className="terminal-content-mdx max-w-4xl mx-auto pt-8 pb-20 px-6">
						<DocsLayout.Header>
							<div className="flex flex-col gap-3 mb-4 border-b border-strong pb-4">
								<div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
									<div className="min-w-0 flex-1">
										<TerminalBreadcrumbs />
									</div>
									<div className="flex w-full items-start justify-start sm:w-auto sm:justify-end">
										<TerminalCopyMarkdown
											mdxRaw={currentRoute?._rawContent}
											route={currentRoute}
										/>
									</div>
								</div>
							</div>
							{currentRoute?.title && (
								<h1 className="text-3xl font-bold text-body mt-6 mb-2 font-mono">
									{currentRoute.title}
								</h1>
							)}
							{currentRoute?.description && (
								<p className="text-paragraph mb-8 text-sm leading-relaxed">
									{currentRoute.description}
								</p>
							)}
						</DocsLayout.Header>

						<ErrorBoundary>{children}</ErrorBoundary>

						<TerminalPageNav />
					</DocsLayout.ContentMdx>
				</DocsLayout.Content>

				<TerminalOnThisPage />
			</DocsLayout.Body>
		</DocsLayout>
	);
}

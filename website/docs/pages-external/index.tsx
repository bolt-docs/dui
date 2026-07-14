import { TerminalNavbar } from "../../components/TerminalNavbar";
import { HomePage } from "./home";

export const pages = {
	"/": HomePage,
};

export const layout = ({ children }: { children: React.ReactNode }) => (
	<div className="min-h-screen">
		<TerminalNavbar />
		<div className="flex">
			<main className="flex-1">{children}</main>
		</div>
		<footer className="bg-main border-t border-strong px-6 py-12 text-xs font-mono text-dim">
			<div className="mx-auto max-w-4xl flex flex-col md:flex-row justify-between items-center gap-6">
				<div className="flex flex-col gap-1">
					<div className="flex items-center gap-2">
						<span className="text-terminal-green font-bold">$</span>
						<span className="text-body font-bold">DUI CLI Toolkit</span>
						<span className="bg-soft border border-strong text-muted px-1.5 py-0.25 text-[10px] rounded">
							v0.4.0
						</span>
					</div>
					<div>©2026 Boltdocs Contributors. MIT License.</div>
				</div>

				<div className="flex flex-wrap gap-x-6 gap-y-2 text-muted">
					<a
						href="/docs/getting-started"
						className="hover:text-terminal-green transition-colors"
					>
						Docs
					</a>
					<a
						href="/docs/api"
						className="hover:text-terminal-green transition-colors"
					>
						API
					</a>
					<a
						href="https://github.com/bolt-docs/dui"
						target="_blank"
						rel="noopener noreferrer"
						className="hover:text-terminal-green transition-colors"
					>
						GitHub
					</a>
					<a
						href="https://npmjs.com/package/@bdocs/dui"
						target="_blank"
						rel="noopener noreferrer"
						className="hover:text-terminal-green transition-colors"
					>
						NPM
					</a>
				</div>
			</div>
		</footer>
	</div>
);

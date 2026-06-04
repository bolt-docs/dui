import { useState } from "react";
import { cn, copyToClipboard } from "boltdocs/client";
import { NPM, Pnpm, Yarn, Bun } from "./icons";
import { Clipboard, ClipboardCheck } from "lucide-react";
import { Tooltip } from "boltdocs/primitives";

interface PackageManagerProps {
	className?: string;
}

const MANAGERS = [
	{ id: "npm", label: "npm", Icon: NPM, command: "npm install @bdocs/dui" },
	{ id: "pnpm", label: "pnpm", Icon: Pnpm, command: "pnpm add @bdocs/dui" },
	{ id: "yarn", label: "yarn", Icon: Yarn, command: "yarn add @bdocs/dui" },
	{ id: "bun", label: "bun", Icon: Bun, command: "bun add @bdocs/dui" },
] as const;

const BRAND_COLORS = {
	npm: "text-[#CB3837]",
	pnpm: "text-[#F9AD00]",
	yarn: "text-[#2C8EBB]",
	bun: "text-[#fbf0df]",
};

export default function PackageManager({
	className = "",
}: PackageManagerProps) {
	const [active, setActive] = useState("pnpm");
	const current = MANAGERS.find((m) => m.id === active) ?? MANAGERS[0];

	return (
		<div className={`my-6 border border-strong ${className}`}>
			<div className="flex items-center gap-2 border-b border-strong bg-main px-4 py-2">
				<span className="text-[10px] uppercase tracking-wider text-muted font-mono">
					bash — dui install
				</span>
			</div>

			<div className="flex border-b border-strong bg-main">
				{MANAGERS.map((m) => {
					const isActive = active === m.id;
					return (
						<button
							key={m.id}
							type="button"
							onClick={() => setActive(m.id)}
							className={cn(
								"group flex items-center gap-2 px-4 py-2.5 text-xs font-mono cursor-pointer bg-transparent transition-colors",
								{
									"border-b-2 border-terminal-green dark:text-white text-black bg-white dark:bg-neutral-900":
										isActive,
									"border-b-2 border-transparent text-muted hover:bg-soft hover:text-black/60 dark:hover:text-white/80":
										!isActive,
								},
							)}
						>
							<m.Icon
								className={cn("size-4 transition-colors", {
									[BRAND_COLORS[m.id]]: isActive,
									"text-muted dark:text-white dark:group-hover:text-white/80 group-hover:text-black/80":
										!isActive,
								})}
							/>
							{m.label}
						</button>
					);
				})}
			</div>

			<div className="flex items-center gap-3 bg-main p-4">
				<code className="flex-1 text-sm font-mono text-[#e5e5e5]">
					<span className="text-terminal-green select-none font-bold">$ </span>
					<span className="dark:text-white text-black/80">
						{current.command}
					</span>
				</code>
				<CopyButton text={current.command} />
			</div>
		</div>
	);
}

function CopyButton({ text }: { text: string }) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		await copyToClipboard(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<Tooltip content={copied ? "Copied!" : "Copy"} delay={300}>
			<button
				type="button"
				onClick={handleCopy}
				className="flex items-center gap-1.5 rounded px-2 py-1 text-xs font-mono text-muted transition-colors hover:bg-soft cursor-pointer bg-transparent border-none"
				aria-label="Copy Code"
			>
				{copied ? (
					<ClipboardCheck className="h-4 w-4 text-[#4ade80]" />
				) : (
					<Clipboard className="h-4 w-4" />
				)}
			</button>
		</Tooltip>
	);
}

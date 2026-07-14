import { useState } from "react";
import { cn, copyToClipboard } from "boltdocs/client";
import { NPM, Pnpm, Yarn, Bun } from "./icons";
import { Clipboard, ClipboardCheck } from "lucide-react";
import { Tooltip } from "boltdocs/primitives";

interface PackageManagerProps {
	className?: string;
	/** Package identifier to display in the install command (default: `@bdocs/dui`). */
	pkg?: string;
	/** Heading shown in the tab strip (default: `bash — dui install`). */
	title?: string;
}

const PACKAGES = {
	"@bdocs/dui": {
		core: "@bdocs/dui",
		npm: "npm install @bdocs/dui",
		pnpm: "pnpm add @bdocs/dui",
		yarn: "yarn add @bdocs/dui",
		bun: "bun add @bdocs/dui",
		heading: "bash — dui install",
	},
	"@dui-toolkit/plugin-markdown": {
		core: "@dui-toolkit/plugin-markdown",
		npm: "npm install @dui-toolkit/plugin-markdown",
		pnpm: "pnpm add @dui-toolkit/plugin-markdown",
		yarn: "yarn add @dui-toolkit/plugin-markdown",
		bun: "bun add @dui-toolkit/plugin-markdown",
		heading: "bash — plugin install",
	},
	"@dui-toolkit/plugin-image": {
		core: "@dui-toolkit/plugin-image",
		npm: "npm install @dui-toolkit/plugin-image",
		pnpm: "pnpm add @dui-toolkit/plugin-image",
		yarn: "yarn add @dui-toolkit/plugin-image",
		bun: "bun add @dui-toolkit/plugin-image",
		heading: "bash — plugin install",
	},
	"@dui-toolkit/plugin-chart": {
		core: "@dui-toolkit/plugin-chart",
		npm: "npm install @dui-toolkit/plugin-chart",
		pnpm: "pnpm add @dui-toolkit/plugin-chart",
		yarn: "yarn add @dui-toolkit/plugin-chart",
		bun: "bun add @dui-toolkit/plugin-chart",
		heading: "bash — plugin install",
	},
	"@dui-toolkit/plugin-diff": {
		core: "@dui-toolkit/plugin-diff",
		npm: "npm install @dui-toolkit/plugin-diff",
		pnpm: "pnpm add @dui-toolkit/plugin-diff",
		yarn: "yarn add @dui-toolkit/plugin-diff",
		bun: "bun add @dui-toolkit/plugin-diff",
		heading: "bash — plugin install",
	},
	"@dui-toolkit/plugin-qrcode": {
		core: "@dui-toolkit/plugin-qrcode",
		npm: "npm install @dui-toolkit/plugin-qrcode",
		pnpm: "pnpm add @dui-toolkit/plugin-qrcode",
		yarn: "yarn add @dui-toolkit/plugin-qrcode",
		bun: "bun add @dui-toolkit/plugin-qrcode",
		heading: "bash — plugin install",
	},
} as const;

/**
 * Build install commands for an arbitrary package identifier that
 * may not be pre-registered (e.g. `@scope/new-plugin` published after
 * this component was last touched). Falls back to plain `add <pkg>` /
 * `install <pkg>` commands using the standard verbs each manager
 * expects.
 */
function fallbackCommands(pkg: string) {
	return {
		npm: `npm install ${pkg}`,
		pnpm: `pnpm add ${pkg}`,
		yarn: `yarn add ${pkg}`,
		bun: `bun add ${pkg}`,
	};
}

/**
 * Renders a tabbed install snippet for npm / pnpm / yarn / bun.
 *
 * Pass `pkg="@dui-toolkit/plugin-foo"` in plugin docs to show the
 * correct install command for that package rather than `@bdocs/dui`.
 * Falls back to whatever arbitrary package name is passed if it's
 * not in the pre-registered table.
 */
export default function PackageManager({
	className = "",
	pkg: pkgProp,
	title,
}: PackageManagerProps) {
	const pkg = pkgProp ?? "@bdocs/dui";
	const known = (PACKAGES as Record<string, (typeof PACKAGES)[keyof typeof PACKAGES]>)[pkg];
	const commands = known
		? {
				core: known.core,
				npm: known.npm,
				pnpm: known.pnpm,
				yarn: known.yarn,
				bun: known.bun,
				heading: known.heading,
			}
		: {
				core: pkg,
				...fallbackCommands(pkg),
				heading: title ?? "bash — install",
			};

	type ManagerId = "pnpm" | "npm" | "yarn" | "bun";

	const [active, setActive] = useState<ManagerId>("pnpm");

	const managers: Array<{
		id: ManagerId;
		label: string;
		Icon: typeof NPM;
		command: string;
	}> = [
		{ id: "pnpm", label: "pnpm", Icon: Pnpm, command: commands.pnpm },
		{ id: "npm", label: "npm", Icon: NPM, command: commands.npm },
		{ id: "yarn", label: "yarn", Icon: Yarn, command: commands.yarn },
		{ id: "bun", label: "bun", Icon: Bun, command: commands.bun },
	];
	const current = managers.find((m) => m.id === active) ?? managers[0];

	const BRAND_COLORS: Record<ManagerId, string> = {
		pnpm: "text-[#F9AD00]",
		npm: "text-[#CB3837]",
		yarn: "text-[#2C8EBB]",
		bun: "text-[#fbf0df]",
	};

	return (
		<div className={`my-6 border border-strong ${className}`}>
			<div className="flex items-center gap-2 border-b border-strong bg-main px-4 py-2">
				<span className="text-[10px] uppercase tracking-wider text-muted font-mono">
					{commands.heading}
				</span>
			</div>

			<div className="flex border-b border-strong bg-main">
				{managers.map((m) => {
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

export { PACKAGES, fallbackCommands };

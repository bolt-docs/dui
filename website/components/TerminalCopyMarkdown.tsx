import { Clipboard, ClipboardCheck, ChevronDown } from "lucide-react";
import { Button, Menu } from "boltdocs/primitives";
import { useState } from "react";
import { copyToClipboard } from "boltdocs/client";

interface TerminalCopyMarkdownProps {
	content?: string;
	mdxRaw?: string;
	route?: { path?: string; _rawContent?: string };
}

export function TerminalCopyMarkdown({
	content,
	mdxRaw,
}: TerminalCopyMarkdownProps) {
	const [copied, setCopied] = useState(false);

	const source = content ?? mdxRaw ?? "";

	const handleCopy = async () => {
		if (!source) return;
		await copyToClipboard(source);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	if (!source) return null;

	return (
		<div className="flex w-full max-w-[18rem] flex-shrink-0 overflow-hidden border border-strong sm:w-auto">
			<Button
				onPress={handleCopy}
				className="flex items-center gap-1.5 rounded-none border-r border-strong dark:bg-neutral-950 px-2.5 py-1.5 text-[10px] font-mono text-muted hover:bg-soft dark:hover:text-white/80 hover:text-black/80 transition-colors cursor-pointer"
			>
				{copied ? (
					<ClipboardCheck className="size-3.5 text-terminal-green" />
				) : (
					<Clipboard className="size-3.5" />
				)}
				{copied ? "Copied" : "Copy"}
			</Button>
			<Menu.Trigger placement="bottom end">
				<Button className="rounded-none dark:bg-neutral-950 px-2 py-1.5 text-muted hover:bg-soft hover:text-black dark:hover:text-white transition-colors cursor-pointer">
					<ChevronDown className="h-3 w-3" />
				</Button>
				<Menu className="min-w-36 border border-strong bg-main dark:bg-neutral-950 p-1 font-mono text-xs shadow-lg">
					<Menu.Item
						onAction={handleCopy}
						className="flex items-center gap-2 px-2.5 py-1.5 text-muted hover:bg-soft hover:text-black/80 dark:hover:bg-neutral-800 dark:hover:text-white/80 cursor-pointer transition-colors"
					>
						Copy source
					</Menu.Item>
				</Menu>
			</Menu.Trigger>
		</div>
	);
}

import { Heading, Link } from "boltdocs/primitives";
import { useCallback, useEffect, useRef, useState } from "react";

const Anchor = (props: React.ComponentProps<typeof Link>) => (
	<Link
		className="underline decoration-from-font underline-offset-2 decoration-link/40 hover:decoration-link-hover text-link font-medium hover:text-link-hover transition-colors duration-150"
		{...props}
	/>
);

const Blockquote = (props: React.HTMLAttributes<HTMLQuoteElement>) => (
	<blockquote
		className="border-l-2 border-strong pl-5 py-3 my-10 text-muted leading-relaxed text-sm"
		{...props}
	/>
);

const Hr = (props: React.HTMLAttributes<HTMLHRElement>) => (
	<hr className="my-16 border-t border-strong" {...props} />
);

const H1 = (props: React.ComponentProps<typeof Heading>) => (
	<Heading
		level={1}
		className="text-3xl sm:text-4xl font-bold tracking-tight text-body border-b border-strong pb-5 mb-10 font-display"
		{...props}
	/>
);

const H2 = (props: React.ComponentProps<typeof Heading>) => (
	<Heading
		level={2}
		className="text-xl sm:text-2xl font-semibold tracking-tight text-body mt-14 mb-5 border-b border-subtle pb-3 font-display"
		{...props}
	/>
);

const H3 = (props: React.ComponentProps<typeof Heading>) => (
	<Heading
		level={3}
		className="text-base sm:text-lg font-semibold text-body mt-10 mb-3 font-display"
		{...props}
	/>
);

const H4 = (props: React.ComponentProps<typeof Heading>) => (
	<Heading
		level={4}
		className="text-sm font-medium text-body mt-8 mb-2 font-display"
		{...props}
	/>
);

const P = (props: React.HTMLAttributes<HTMLParagraphElement>) => (
	<p className="text-paragraph leading-7 mt-4 mb-6 max-w-prose" {...props} />
);

const Ul = (props: React.HTMLAttributes<HTMLUListElement>) => (
	<ul
		className="list-disc list-outside mt-4 mb-6 pl-6 space-y-2 text-paragraph leading-7"
		{...props}
	/>
);

const Ol = (props: React.HTMLAttributes<HTMLOListElement>) => (
	<ol
		className="list-decimal list-outside mt-4 mb-6 pl-6 space-y-2 text-paragraph leading-7"
		{...props}
	/>
);

const Li = (props: React.HTMLAttributes<HTMLLIElement>) => (
	<li className="leading-7" {...props} />
);

/* ── Code block — terminal window ───────────────────────────── */

function CopyButton({ text }: { text: string }) {
	const [copied, setCopied] = useState(false);

	const handleCopy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			const ta = document.createElement("textarea");
			ta.value = text;
			document.body.appendChild(ta);
			ta.select();
			document.execCommand("copy");
			document.body.removeChild(ta);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		}
	}, [text]);

	return (
		<button
			type="button"
			onClick={handleCopy}
			className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-mono rounded-md border border-black/[0.1] dark:border-white/[0.15] text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white hover:border-black/[0.2] dark:hover:border-white/[0.3] hover:bg-black/[0.04] dark:hover:bg-white/[0.08] transition-all duration-150 cursor-pointer"
			aria-label={copied ? "Copied" : "Copy code"}
		>
			{copied ? (
				<>
					<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
						<polyline points="20 6 9 17 4 12" />
					</svg>
					<span className="text-neutral-600 dark:text-neutral-400">Copied</span>
				</>
			) : (
				<>
					<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
						<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
					</svg>
					Copy
				</>
			)}
		</button>
	);
}

const Pre = (props: React.HTMLAttributes<HTMLPreElement>) => {
	const preRef = useRef<HTMLPreElement>(null);
	const [text, setText] = useState("");

	useEffect(() => {
		setText(preRef.current?.textContent ?? "");
	}, []);

	// Extract a filename hint from the first code line if available.
	// Skip shebangs (#!/usr/bin/node) — those aren't filenames.
	const firstLine = text.split("\n")[0] ?? "";
	const fileNameHint =
		(firstLine.startsWith("#") && !firstLine.startsWith("#!")) ||
		firstLine.startsWith("//")
			? firstLine.replace(/^[#/]+\s*/, "").trim()
			: "";

	return (
		<div className="group/code my-8 overflow-hidden rounded-xl border border-strong/60 shadow-lg shadow-black/[0.06] dark:shadow-black/[0.3]">
			{/* Terminal window title bar */}
			<div className="flex items-center justify-between px-4 py-2.5 bg-[#e8e7e5] dark:bg-[#1e1e1e] border-b border-black/[0.06] dark:border-white/[0.06] select-none">
				<div className="flex items-center gap-2" aria-hidden="true">
					<span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57] shadow-[inset_0_1px_1px_rgba(0,0,0,0.12)]" />
					<span className="w-2.5 h-2.5 rounded-full bg-[#febc2e] shadow-[inset_0_1px_1px_rgba(0,0,0,0.12)]" />
					<span className="w-2.5 h-2.5 rounded-full bg-[#28c840] shadow-[inset_0_1px_1px_rgba(0,0,0,0.12)]" />
				</div>
				{fileNameHint && (
					<div className="text-[11px] text-[#888888] dark:text-[#666666] font-medium font-sans tracking-wide truncate max-w-[50%]">
						{fileNameHint}
					</div>
				)}
				<CopyButton text={text} />
			</div>

			{/* Code content — bg uses CSS var with terminal-dark fallback */}
			<pre
				ref={preRef}
				className="overflow-x-auto bg-[var(--color-code-bg,#f5f4f2)] dark:bg-[var(--color-code-bg,#0d0d0d)] px-5 py-4 text-sm leading-relaxed font-mono text-[#1a1a1a] dark:text-[#e0e0e0]"
				{...props}
			/>
		</div>
	);
};

const Code = (props: React.HTMLAttributes<HTMLElement>) => {
	const isInline = typeof props.children === "string" && !props.children?.includes?.("\n");
	return (
		<code
			className={`font-mono ${
				isInline
					? "rounded-md px-1.5 py-0.5 bg-[var(--color-code-bg,#f0efee)] dark:bg-[var(--color-code-bg,#111111)] text-[var(--color-code-text,#1a1918)] dark:text-[var(--color-code-text,#e0e0e0)] text-[0.8125em] border border-strong/50"
					: ""
			}`}
			{...props}
		/>
	);
};

export const typographics = {
	a: Anchor,
	blockquote: Blockquote,
	hr: Hr,
	h1: H1,
	h2: H2,
	h3: H3,
	h4: H4,
	p: P,
	ul: Ul,
	ol: Ol,
	li: Li,
	pre: Pre,
	code: Code,
	inlineCode: Code,
};

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

/* ── Code block with copy button ───────────────────────────── */

function CopyButton({ text }: { text: string }) {
	const [copied, setCopied] = useState(false);

	const handleCopy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			// Fallback for older browsers
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
			className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-mono rounded-md border border-strong/50 bg-main/80 text-muted hover:text-body hover:border-strong hover:bg-soft/80 backdrop-blur-sm transition-all duration-150 cursor-pointer opacity-0 group-hover/code:opacity-100 focus:opacity-100"
			aria-label={copied ? "Copied" : "Copy code"}
		>
			{copied ? (
				<>
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
						<polyline points="20 6 9 17 4 12" />
					</svg>
					Copied
				</>
			) : (
				<>
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

	// Read the pre content after mount — ref is null during initial render.
	useEffect(() => {
		setText(preRef.current?.textContent ?? "");
	}, []);

	return (
		<div className="group/code relative my-8">
			<pre
				ref={preRef}
				className="overflow-x-auto rounded-xl border border-strong/70 bg-code-bg p-5 text-sm leading-relaxed font-mono shadow-sm"
				{...props}
			/>
			<CopyButton text={text} />
		</div>
	);
};

const Code = (props: React.HTMLAttributes<HTMLElement>) => (
	<code
		className="rounded-md px-1.5 py-0.5 bg-code-bg text-code-text text-[0.8125em] font-mono border border-strong/60"
		{...props}
	/>
);

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

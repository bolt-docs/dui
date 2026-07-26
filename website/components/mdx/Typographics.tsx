import { Heading, Link } from "boltdocs/primitives";

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

const Pre = (props: React.HTMLAttributes<HTMLPreElement>) => (
	<pre
		className="overflow-x-auto rounded-xl border border-strong bg-code-bg p-5 my-8 text-sm leading-relaxed font-mono shadow-sm"
		{...props}
	/>
);

const Code = (props: React.HTMLAttributes<HTMLElement>) => (
	<code
		className="rounded-md px-1.5 py-0.5 bg-code-bg text-code-text text-[0.875em] font-mono border border-strong/50"
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

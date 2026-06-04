import { Heading, Link } from "boltdocs/primitives";

const Anchor = (props: React.ComponentProps<typeof Link>) => (
	<Link
		className="underline decoration-from-font underline-offset-2 decoration-muted/60 hover:decoration-muted text-muted font-medium hover:text-body"
		{...props}
	/>
);

const Blockquote = (props: React.HTMLAttributes<HTMLQuoteElement>) => (
	<blockquote
		className="border-l-2 border-strong pl-4 py-1 my-6 text-muted font-mono text-sm"
		{...props}
	/>
);

const Hr = (props: React.HTMLAttributes<HTMLHRElement>) => (
	<hr className="my-10 border-t border-strong" {...props} />
);

const H2 = (props: React.ComponentProps<typeof Heading>) => (
	<Heading level={2} className="font-mono mt-9 mb-3 border-strong" {...props} />
);

const H3 = (props: React.ComponentProps<typeof Heading>) => (
	<Heading level={3} className="font-mono mt-7 mb-2" {...props} />
);

const P = (props: React.HTMLAttributes<HTMLParagraphElement>) => (
	<p className="text-paragraph leading-relaxed mt-2 mb-4" {...props} />
);

const Ul = (props: React.HTMLAttributes<HTMLUListElement>) => (
	<ul
		className="list-disc list-inside mt-2 mb-4 pl-4 space-y-1.5 text-paragraph"
		{...props}
	/>
);

const Ol = (props: React.HTMLAttributes<HTMLOListElement>) => (
	<ol
		className="list-decimal list-inside mt-2 mb-4 pl-4 space-y-1.5 text-paragraph"
		{...props}
	/>
);

const Li = (props: React.HTMLAttributes<HTMLLIElement>) => (
	<li className="leading-relaxed" {...props} />
);

export const typographics = {
	a: Anchor,
	blockquote: Blockquote,
	hr: Hr,
	h2: H2,
	h3: H3,
	p: P,
	ul: Ul,
	ol: Ol,
	li: Li,
};

import { defineConfig } from "boltdocs";

export default defineConfig({
	base: "/docs",
	versions: {
		defaultVersion: "v0.6.0",
		prefix: "",
		versions: [
			{
				label: "v0.6.0",
				path: "v0.6.0",
			},
			{
				label: "Next (v0.7.0)",
				path: "next",
			},
			{
				label: "v0.5.0",
				path: "v0.5.0",
			},
		],
	},
	i18n: {
		locales: ["en", "es"],
		defaultLocale: "en",
		localeConfigs: {
			en: {
				label: "English",
				htmlLang: "en",
			},
			es: {
				label: "Español",
				htmlLang: "es",
			},
		},
	},
	siteUrl: "https://bdocs-dui.vercel.app",
	seo: {
		indexing: "all",
	},
	theme: {
		title: "DUI",
		description:
			"Terminal UI utilities — boxes, colors, logging, lists, dividers, and more.",
		navbar: [
			{
				label: {
					es: "Documentación",
					en: "Documentation",
				},
				href: "/docs/v0.6.0/overview",
			},
			{
				label: "Plugins",
				href: "/docs/v0.6.0/plugins",
			},
			{
				label: "API",
				href: "/docs/v0.6.0/api",
			},
		],
		codeTheme: {
			light: "github-light",
			dark: "github-dark",
		},
		favicon: "/dark.svg",
		logo: {
			dark: "/dark.svg",
			light: "/light.svg",
			alt: "DUI Logo",
		},
		editLink:
			"https://github.com/bolt-docs/dui/edit/main/website/docs/:version/:path",
		githubRepo: "bolt-docs/dui",
	},
	vite: {
		ssr: {
			// Bundle boltdocs in the SSR graph so its dist chunks resolve
			// virtual:boltdocs-* modules instead of leaking them to Node.
			noExternal: ["boltdocs"],
		},
	},
	robots: {
		rules: [
			{
				userAgent: "*",
				allow: "/",
			},
		],
		sitemaps: ["https://bdocs-dui.vercel.app/sitemap.xml"],
	},
});

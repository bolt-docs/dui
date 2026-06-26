import { defineConfig } from "boltdocs";

export default defineConfig({
	base: "/docs",
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
				href: "/docs/overview",
			},
			{
				label: "Plugins",
				href: "/docs/plugins",
			},
			{
				label: "API",
				href: "/docs/api",
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
		editLink: "https://github.com/bolt-docs/dui/edit/main/website/docs/:path",
		githubRepo: "bolt-docs/dui",
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

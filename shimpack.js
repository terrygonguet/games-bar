const PurgeCSS = require("@fullhuman/postcss-purgecss")
const fs = require("fs").promises
const postcss = require("postcss")

const dev = process.argv[2] == "development"

const purgeCSSPlugin = PurgeCSS({
	content: [
		"./src/**/*.svelte",
		"./src/template-master.html",
		"./blogdata/*.json"
	],
	fontFace: true,
	defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || [],
	extractors: [
		{
			extractor: require("purgecss-from-svelte"),
			extensions: ["svelte"]
		}
	],
	whitelist: [
		"suit-diamonds",
		"suit-hearts",
		"suit-clubs",
		"suit-spades",
		"rank-1",
		"rank-2",
		"rank-3",
		"rank-4",
		"rank-5",
		"rank-6",
		"rank-7",
		"rank-8",
		"rank-9",
		"rank-10",
		"rank-11",
		"rank-12",
		"rank-13",
		"card-back",
		"card",
		"piece",
		"white-king",
		"white-queen",
		"white-bishop",
		"white-rook",
		"white-knight",
		"white-pawn",
		"black-king",
		"black-queen",
		"black-bishop",
		"black-rook",
		"black-knight",
		"black-pawn"
	]
})

/**
 * Builds the template.html for Sapper
 */
async function shimTemplate() {
	console.log("Read files...")
	let master = await fs.readFile("src/template-master.html")
	let tailwind = await fs.readFile("src/global.css")

	console.log("Compile CSS...")
	let plugins = [
		require("tailwindcss"),
		require("autoprefixer"),
		!dev && purgeCSSPlugin,
		!dev && require("cssnano")()
	].filter(Boolean)
	let { css } = await postcss(plugins).process(tailwind, {
		from: "src/global.css",
		to: "global.css"
	})

	console.log("Replace CSS in template...")
	let template = master
		.toString()
		.replace("%tailwind.styles%", `<style>${css}</style>\n`)

	console.log("Write template.html...")
	await fs.writeFile("src/template.html", template)

	console.log("Done!")
}

shimTemplate()

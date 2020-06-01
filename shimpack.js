const fs = require("fs").promises
const postcss = require("postcss")

const dev = process.argv[2] == "development"
if (!dev) process.env.NODE_ENV = "production"

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

const webpack = require("webpack")
const path = require("path")
const config = require("sapper/config/webpack.js")
const pkg = require("./package.json")
const CompressionPlugin = require("compression-webpack-plugin")
const dotenv = require("dotenv")

dotenv.config()

const mode = process.env.NODE_ENV
const dev = mode === "development"

const extensions = [".mjs", ".js", ".json", ".svelte", ".html"]
const mainFields = ["svelte", "module", "browser", "main"]

function templateDependency({ content, filename }) {
	return {
		code: content,
		dependencies: filename.endsWith("_layout.svelte")
			? [
					path.join(__dirname, "src/template.html"),
					path.join(__dirname, "tailwind.config.js")
			  ]
			: []
	}
}

const alias = {
	"~server": path.resolve(__dirname, "src/server"),
	"~tools": path.resolve(__dirname, "src/tools"),
	"~stores": path.resolve(__dirname, "src/stores"),
	"~components": path.resolve(__dirname, "src/components"),
	svelte: path.resolve("node_modules", "svelte")
}

const plugins = (server = false) =>
	[
		new webpack.DefinePlugin({
			"process.browser": !server,
			"process.dev": dev,
			"process.env.NODE_ENV": JSON.stringify(mode),
			"process.env.RATE_LIMIT": process.env.RATE_LIMIT || 2
		}),
		!dev && new CompressionPlugin(),
		!dev &&
			new CompressionPlugin({
				filename: "[path].br[query]",
				algorithm: "brotliCompress",
				test: /\.(js|css|html|svg)$/,
				compressionOptions: { level: 11 },
				threshold: 10240,
				minRatio: 0.8,
				deleteOriginalAssets: false
			})
	].filter(Boolean)

const client = {
	mode,
	entry: config.client.entry(),
	output: config.client.output(),
	resolve: { alias, extensions, mainFields },
	module: {
		rules: [
			{
				test: /\.(svelte|html)$/,
				use: {
					loader: "svelte-loader",
					options: {
						dev,
						hydratable: true,
						preprocess: {
							style: templateDependency
						}
					}
				}
			}
		]
	},
	mode,
	plugins: plugins(false),
	devtool: dev && "inline-source-map",
	devServer: {
		watchContentBase: true
	}
}

const server = {
	mode,
	entry: config.server.entry(),
	output: config.server.output(),
	target: "node",
	resolve: { alias, extensions, mainFields },
	externals: Object.keys(pkg.dependencies).concat("encoding"),
	plugins: plugins(true),
	module: {
		rules: [
			{
				test: /\.(svelte|html)$/,
				use: {
					loader: "svelte-loader",
					options: {
						css: false,
						generate: "ssr",
						dev
					}
				}
			}
		]
	},
	mode: process.env.NODE_ENV,
	performance: {
		hints: false // it doesn't matter if server.js is large
	}
}

const serviceworker = {
	entry: config.serviceworker.entry(),
	output: config.serviceworker.output(),
	mode: process.env.NODE_ENV
}

module.exports = {
	client,
	server,
	serviceworker
}

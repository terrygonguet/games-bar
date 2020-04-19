const webpack = require("webpack")
const path = require("path")
const config = require("sapper/config/webpack.js")
const pkg = require("./package.json")
const CompressionPlugin = require("compression-webpack-plugin")

const mode = process.env.NODE_ENV
const dev = mode === "development"

const alias = { svelte: path.resolve("node_modules", "svelte") }
const extensions = [".mjs", ".js", ".json", ".svelte", ".html"]
const mainFields = ["svelte", "module", "browser", "main"]

function templateDependency({ content, filename }) {
	return {
		code: content,
		dependencies: filename.endsWith("_layout.svelte")
			? [path.join(__dirname, "src/template.html")]
			: []
	}
}

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
	plugins: [
		new webpack.DefinePlugin({
			"process.browser": true,
			"process.env.NODE_ENV": JSON.stringify(mode)
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
	].filter(Boolean),
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

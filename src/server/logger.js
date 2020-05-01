import chalk from "chalk"

/** @typedef {"info"|"warn"|"error"|"verbose"} LogLevel */

/**
 * @param {string} game
 * @param {LogLevel[]} levels
 */
export default function logger(game, levels) {
	if (levels === undefined) {
		levels = ["error", "warn", "info"]
		if (process.dev) levels.push("verbose")
	}
	const enableColor = !["false", "0"].includes(process.env.COLOR)
	const id = a => a
	const l = levels.reduce((acc, cur) => Math.max(acc, cur.length), 0)
	const ctx = new chalk.Instance({ level: 1 })
	/** @type {Object<string,chalk.Chalk>} */
	const colors = {
		error: enableColor ? ctx.red : id,
		warn: enableColor ? ctx.yellow : id,
		info: enableColor ? ctx.white : id,
		verbose: enableColor ? ctx.gray : id
	}

	return {
		/**
		 * @param {any} obj
		 * @param {Object} options
		 * @param {LogLevel} options.level
		 */
		log(obj, { level = "info" } = {}) {
			const now = new Date().toISOString()
			console.log(
				colors[level](`[${now}] [${level.padEnd(l)}] [${game}] ${obj}`)
			)
		},
		/**
		 * @param {string} roomName
		 * @param {any} obj
		 * @param {Object} options
		 * @param {LogLevel} options.level
		 */
		logRoom(roomName, obj, { level = "info" } = {}) {
			const now = new Date().toISOString()
			console.log(
				colors[level](
					`[${now}] [${level.padEnd(
						l
					)}] [${game}] [${roomName}] ${obj}`
				)
			)
		}
	}
}

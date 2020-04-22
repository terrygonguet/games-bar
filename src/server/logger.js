export default function logger(game) {
	return {
		log(...args) {
			const now = new Date().toISOString()
			for (const arg of args) console.log(`[${now}] [${game}] ${arg}`)
		},
		logRoom(roomName, ...args) {
			const now = new Date().toISOString()
			for (const arg of args)
				console.log(`[${now}] [${game}] [${roomName}] ${arg}`)
		},
		error(...args) {
			const now = new Date().toISOString()
			for (const arg of args) console.error(`[${now}] [${game}] ${arg}`)
		},
		errorRoom(roomName, ...args) {
			const now = new Date().toISOString()
			for (const arg of args)
				console.error(`[${now}] [${game}] [${roomName}] ${arg}`)
		}
	}
}

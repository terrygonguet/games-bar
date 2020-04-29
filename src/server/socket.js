import io from "socket.io"
import games from "./games"
import logger from "~server/logger"

const { log, error } = logger("general")

const requestable = {
	AVAILABLE_GAMES: Object.keys(games)
}

export default function(app) {
	const server = io(app.server)

	server.on("connection", socket => {
		const n = Object.keys(server.sockets.sockets).length
		log(`${socket.id} connected - ${n} connected`)

		socket.on("disconnect", () => {
			const n = Object.keys(server.sockets.sockets).length
			log(`${socket.id} disconnected - ${n} connected`)
		})

		socket.on("request_data", (key, ack) => {
			if (Object.keys(requestable).includes(key)) {
				ack(requestable[key])
				log(`${socket.id} requested ${key}, ok`)
			} else error(`${socket.id} requested invalid key ${key}`)
		})
	})

	for (const game of games) {
		game.handler(server.of("/" + game.path))
	}
}

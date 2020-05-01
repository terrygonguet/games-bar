import io from "socket.io"
import games from "~server/games"
import logger from "~server/logger"

const { log } = logger("general")

const requestable = {
	AVAILABLE_GAMES: () => games,
	NUMBER_CONNECTED:
		/**
		 * @param {SocketIO.Server} server
		 */
		server => Object.keys(server.sockets.sockets).length
}

export default function(app) {
	const server = io(app.server)

	server.on("connection", socket => {
		const n = requestable.NUMBER_CONNECTED(server)
		log(`${socket.id} connected - ${n} connected`)

		socket.on("disconnect", () => {
			const n = requestable.NUMBER_CONNECTED(server)
			log(`${socket.id} disconnected - ${n} connected`)
		})

		socket.on("request_data", (key, ack) => {
			if (key in requestable) {
				ack(requestable[key]())
				log(`${socket.id} requested ${key}, ok`)
			} else
				log(`${socket.id} requested invalid key ${key}`, {
					level: "error"
				})
		})
	})

	for (const game of games) {
		game.handler(server.of("/" + game.path))
	}
}

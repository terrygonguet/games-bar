import io from "socket.io"
import games from "./games"

const requestable = {
	AVAILABLE_GAMES: Object.keys(games)
}

export default function(app) {
	const server = io(app.server)

	server.on("connection", socket => {
		const n = Object.keys(server.sockets.sockets).length
		console.log(`${socket.id} connected - ${n} connected`)

		socket.on("disconnect", () => {
			const n = Object.keys(server.sockets.sockets).length
			console.log(`${socket.id} disconnected - ${n} connected`)
		})

		socket.on("request_data", (key, ack) => {
			if (Object.keys(requestable).includes(key)) ack(requestable[key])
		})
	})

	for (const game in games) {
		games[game](server.of("/" + game))
	}
}

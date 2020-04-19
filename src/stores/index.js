import { readable } from "svelte/store"
import { getSocket } from "../tools"

const socket = getSocket()

export const availableGames = readable([], set => {
	socket.emit("request_data", "AVAILABLE_GAMES", set)
	return () => set([])
})

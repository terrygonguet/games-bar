import { readable, get } from "svelte/store"
import { getSocket } from "~tools"
import { applyPatches } from "immer"

const socket = getSocket()

export const availableGames = readable([], set => {
	socket.emit("request_data", "AVAILABLE_GAMES", set)
	return () => set([])
})

/**
 * @param {SocketIO.Socket} socket
 * @param {string} room
 */
export function makeStateFromSocket(socket, room) {
	let store = readable({}, function(set) {
		socket.emit("get_initial_state", room, set)
		function onApplyPatches(patches) {
			set(applyPatches(get(store), patches))
		}
		socket.on("apply_patches", onApplyPatches)
		return () => socket.off("apply_patches", onApplyPatches)
	})
	return store
}

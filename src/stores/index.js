import { readable, derived } from "svelte/store"
import { getSocket } from "~tools"
import { applyPatches } from "immer"

const socket = getSocket()

/**
 * @param {SocketIO.Socket} socket
 * @param {string} room
 */
export function makeStateFromSocket(socket, room) {
	let state = null
	let store = readable(state, function(set) {
		socket.emit("get_initial_state", room, data => {
			state = data
			set(state)
		})
		function onApplyPatches(patches) {
			state = applyPatches(state, patches)
			set(state)
		}
		socket.on("apply_patches", onApplyPatches)
		return () => socket.off("apply_patches", onApplyPatches)
	})
	return store
}

export function stateProp(state, prop) {
	let prev
	return derived(state, ($s, set) => {
		if ($s && prev != $s[prop]) set((prev = $s[prop]))
	})
}

import io from "socket.io-client"

/**
 * Capitalizes the first letter of `str`
 * @param {string} str
 */
export function capitalize(str) {
	return str[0].toUpperCase() + str.slice(1)
}

/** @type {Map<string, SocketIO.Socket>} */
const socketMap = new Map()
export function getSocket(nsp = "") {
	if (socketMap.has(nsp)) return socketMap.get(nsp)
	else {
		const socket = io("/" + nsp)
		socketMap.set(nsp, socket)
		return socket
	}
}

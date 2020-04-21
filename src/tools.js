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
		const socket = io("/" + nsp, { transports: ["websocket"] })
		socketMap.set(nsp, socket)
		return socket
	}
}

/**
 * @param {Function} fn
 * @param {number} ms
 * @param {Object} options
 * @param {boolean=} options.useFirstArgs
 */
export function rateLimit(fn, ms, { useFirstArgs = false } = {}) {
	let timeoutID, realArgs
	return function(...args) {
		if (realArgs === undefined || !useFirstArgs) realArgs = args
		if (timeoutID === undefined)
			timeoutID = setTimeout(() => {
				fn(...realArgs)
				timeoutID = undefined
				realArgs = undefined
			}, ms)
	}
}

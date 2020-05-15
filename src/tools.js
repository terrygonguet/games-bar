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

/** @typedef {(a: string, b: RequestInit) => Promise<Response>} FetchFn */

/** @typedef {(status: number, message: string) => void} ErrorFn */

/**
 * @typedef {Object} ServerData
 * @property {boolean} error
 * @property {string} message
 * @property {any} data
 */

/**
 * @param {{ fetch: FetchFn, error: ErrorFn }} ctx
 * @param {string} url
 * @param {RequestInit=} options
 */
export async function easyFetch(ctx, url, options) {
	const res = await ctx.fetch(url, options)
	/** @type {ServerData} */
	const { error, message, data } = await res.json()
	if (error) ctx.error(res.status, message)
	else return data
}

/**
 * @template T
 * @param {T[]} arr
 */
export function last(arr) {
	return arr[arr.length - 1]
}

/**
 * @param {Function} fn
 * @param {number} ms
 * @param {Object} options
 * @param {boolean=} options.useFirstArgs
 */
export function debounce(fn, ms, { useFirstArgs = false } = {}) {
	let timeoutID, realArgs
	return function(...args) {
		if (realArgs === undefined || !useFirstArgs) realArgs = args
		if (timeoutID) clearTimeout(timeoutID)
		timeoutID = setTimeout(() => {
			fn(...realArgs)
			timeoutID = undefined
		}, ms)
	}
}

export function flip(i) {
	let x = i % 6,
		y = Math.floor(i / 6)
	return (5 - y) * 6 + (5 - x)
}

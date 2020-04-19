import io from "socket.io"

/** @typedef {import("./index").Card} Card */

/**
 * @typedef {Object} State
 * @property {Card[]} grid
 * @property {Card[]} deck
 * @property {Card} hand
 */

/**
 * @param {io.Namespace} nsp
 */
export default function(nsp) {
	nsp.on("connect", socket => {
		const n = Object.keys(nsp.sockets).length
		console.log(`${socket.id} joined solitaire - ${n} connected`)

		socket.on("join", room => {
			if (!rooms.has(room)) rooms.set(room, makeState())
			socket.join(room)
			console.log(`${socket.id} joined room ${room}`)
		})
	})
}

/** @type {Map<string, State>} */
const rooms = new Map()

/**
 * @returns {State}
 */
function makeState() {
	return {
		deck: [],
		grid: [],
		hand: { rank: 1, suit: "clubs", hidden: false }
	}
}

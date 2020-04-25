import io from "socket.io"
import { Deck, suits } from "./deck"
import produce from "immer"
import logger from "~server/logger"

const { log, logRoom: rlog } = logger("solitaire")

/** @typedef {import("./deck").Card} Card */

/**
 * @typedef {Object} State
 * @property {Card[]} grid
 * @property {Card[]} reserve
 * @property {Card} hand
 * @property {Card[]} aces
 * @property {"playing"|"won"|"lost"} state
 * @property {string} player
 * @property {{ x: number, y: number }} cardPos
 * @property {boolean} hasSpectator
 */

/**
 * @typedef {Object} Room
 * @property {State} state
 * @property {SocketIO.Socket[]} sockets
 */

/**
 * @param {SocketIO.Namespace} nsp
 */
export default function(nsp) {
	nsp.on("connect", socket => {
		const n = Object.keys(nsp.sockets).length
		log(`${socket.id} joined solitaire - ${n} connected`)

		socket.on("disconnect", disconnect(socket, nsp))

		socket.on("join", joinRoom(socket))

		socket.on("leave", leaveRoom(socket))

		socket.on("get_initial_state", getInitialState(socket))

		socket.on("swap_card", swapCard(socket, nsp))

		socket.on("place_ace", placeAce(socket, nsp))

		socket.on("move_hand", moveHand(socket))
	})
}

/** @type {Map<string, Room>} */
const rooms = new Map()

/**
 * @param {SocketIO.Socket} socket
 * @param {SocketIO.Namespace} nsp
 */
function disconnect(socket, nsp) {
	return () => {
		const n = Object.keys(nsp.sockets).length
		log(`${socket.id} left solitaire - ${n} connected`)
		for (const [roomName, { state, sockets }] of rooms.entries()) {
			if (sockets.includes(socket)) leaveRoom(socket)(roomName)
		}
	}
}

/**
 * @param {SocketIO.Socket} socket
 * @returns {(roomName: string, newpos: { x:number, y: number }) => void}
 */
function moveHand(socket) {
	return (roomName, newpos) => {
		const room = rooms.get(roomName)
		if (!room)
			return rlog(roomName, `Invalid room ${roomName}`, {
				level: "error"
			})
		const { state, sockets } = room
		if (state.player != socket.id)
			return rlog(roomName, "Spectators can't play", { level: "verbose" })
		const patches = []
		const next = produce(
			state,
			draft => void (draft.cardPos = newpos),
			p => patches.push(...p)
		)
		socket.to(roomName).emit("apply_patches", patches)
		rooms.set(roomName, { state: next, sockets })
	}
}

/**
 * @param {SocketIO.Namespace} nsp
 * @param {SocketIO.Socket} socket
 * @returns {(roomName: string, i: number) => void}
 */
function placeAce(socket, nsp) {
	return (roomName, i) => {
		const room = rooms.get(roomName)
		if (!room)
			rlog(roomName, `Invalid room ${roomName}`, { level: "error" })
		const { state, sockets } = room
		if (state.player != socket.id)
			return rlog(roomName, "Spectators can't play", { level: "verbose" })
		const correct = {
			rank: 1,
			suit: suits[i]
		}
		if (!Deck.equals(state.hand, correct))
			return rlog(
				roomName,
				`Invalid swap. Expected a ${Deck.stringifyCard(
					correct
				)} but got a ${Deck.stringifyCard(state.hand)} instead`,
				{ level: "verbose" }
			)
		const patches = []
		const next = produce(
			state,
			draft => {
				draft.aces[i] = draft.hand
				if (draft.reserve.length) {
					draft.hand = draft.reserve.pop()
					draft.hand.hidden = false
				} else {
					draft.hand = null
					draft.grid.forEach(c => (c.hidden = false))
					draft.state = isGameWon(draft.grid) ? "won" : "lost"
				}
			},
			p => patches.push(...p)
		)
		nsp.to(roomName).emit("apply_patches", patches)
		rooms.set(roomName, { state: next, sockets })
	}
}

/**
 * @param {SocketIO.Socket} socket
 * @returns {(roomName: string, i: number) => void}
 */
function swapCard(socket, nsp) {
	return (roomName, i) => {
		const room = rooms.get(roomName)
		if (!room)
			rlog(roomName, `Invalid room ${roomName}`, { level: "error" })
		const { state, sockets } = room
		if (state.player != socket.id)
			return rlog(roomName, "Spectators can't play", { level: "verbose" })
		const correct = {
			suit: suits[Math.floor(i / 7)],
			rank: (i % 7) + 7
		}
		if (!Deck.equals(state.hand, correct))
			return rlog(
				roomName,
				`Invalid swap. Expected a ${Deck.stringifyCard(
					correct
				)} but got a ${Deck.stringifyCard(state.hand)} instead`,
				{ level: "verbose" }
			)
		const patches = []
		const next = produce(
			state,
			draft => {
				const swapped = draft.grid[i]
				draft.grid[i] = draft.hand
				draft.hand = swapped
				swapped.hidden = false
			},
			p => patches.push(...p)
		)
		nsp.to(roomName).emit("apply_patches", patches)
		rooms.set(roomName, { state: next, sockets })
	}
}

/**
 * @param {SocketIO.Socket} socket
 * @returns {(roomName: string, ack: (state: State) => void) => void}
 */
function getInitialState(socket) {
	return (roomName, ack) => {
		if (rooms.has(roomName)) {
			const room = rooms.get(roomName)
			if (room.sockets.includes(socket)) ack(room.state)
			rlog(roomName, `Sent state of room to ${socket.id}`, {
				level: "verbose"
			})
		}
	}
}

/**
 * @param {SocketIO.Socket} socket
 * @returns {(roomName: string) => void}
 */
function joinRoom(socket) {
	return roomName => {
		socket.join(roomName)
		if (!rooms.has(roomName)) {
			rooms.set(roomName, makeRoom(socket))
			rlog(roomName, `Created room`)
			rlog(roomName, `${socket.id} joined`, { level: "verbose" })
		} else {
			const room = rooms.get(roomName)
			const { state, sockets } = room
			const patches = []
			const next = produce(
				state,
				draft => {
					sockets.push(socket)
					draft.hasSpectator = sockets.length > 1
				},
				p => patches.push(...p)
			)
			socket.to(roomName).emit("apply_patches", patches)
			rooms.set(roomName, { state: next, sockets })
			rlog(roomName, `${socket.id} joined`, { level: "verbose" })
			rlog(roomName, `${room.sockets.length} player(s) in room`, {
				level: "verbose"
			})
		}
	}
}

/**
 * @param {SocketIO.Socket} socket
 * @returns {(roomName: string) => void}
 */
function leaveRoom(socket) {
	return roomName => {
		socket.leave(roomName)
		rlog(roomName, `${socket.id} left`, { level: "verbose" })
		if (rooms.has(roomName)) {
			const room = rooms.get(roomName)
			if (room.sockets.length == 1) {
				rooms.delete(roomName)
				rlog(roomName, `Destroyed room`)
			} else {
				const patches = []
				const next = produce(
					state,
					draft => {
						room.sockets = sockets.filter(s => s !== socket)
						draft.hasSpectator = room.sockets.length > 1
					},
					p => patches.push(...p)
				)
				socket.to(roomName).emit("apply_patches", patches)
				rooms.set(roomName, { state: next, sockets })
				rlog(roomName, `${room.sockets.length} player(s) in room`, {
					level: "verbose"
				})
			}
		}
	}
}

/**
 * @param {SocketIO.Socket} socket
 * @returns {Room}
 */
function makeRoom(socket) {
	const deck = Deck.create({ nbCards: 32, shuffle: true })
	const grid = [],
		reserve = []
	grid.push(...Deck.draw(deck, 7, false))
	reserve.push(Deck.drawOne(deck, false))
	grid.push(...Deck.draw(deck, 7, false))
	reserve.push(Deck.drawOne(deck, false))
	grid.push(...Deck.draw(deck, 7, false))
	reserve.push(Deck.drawOne(deck, false))
	grid.push(...Deck.draw(deck, 7, false))

	return {
		state: {
			reserve,
			grid,
			hand: Deck.drawOne(deck, true),
			aces: Array(4).fill(null),
			state: "playing",
			player: socket.id,
			cardPos: { x: 0, y: 0 },
			hasSpectator: false
		},
		sockets: [socket]
	}
}

/**
 * @param {Card[]} grid
 */
function isGameWon(grid) {
	let i = 0,
		isWin = true
	for (const card of grid) {
		const expected = {
			suit: suits[Math.floor(i / 7)],
			rank: (i % 7) + 7
		}
		if (!Deck.equals(expected, card)) {
			isWin = false
			break
		} else i++
	}
	return isWin
}

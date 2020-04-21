import io from "socket.io"
import { Deck, suits } from "./deck"
import produce from "immer"

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
		console.log(`${socket.id} joined solitaire - ${n} connected`)

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

export const rules = [
	"The game starts with a seven by four grid of face down cards, three more face down in the reserve and one in your hand revealed totalling 32 cards: the four aces and cards from seven to King. As the name implied, this game is played alone so you can start immediately. Above and to the right of the grid you will see ranks and suits, indicating where to place each card. You can swap the card in your hand with the card that is face down where yours is supposed to go. If you pick up anything between a seven and a King you continue to replace cards normally. If you pick up an ace you have to place it in the rightmost column and a new card will be automatically placed from the reserve in your hand.",
	"The goal of the game is to swap all the cards in the grid with the correct one before revealing all four aces. Once place the last ace the game is over an any card that is still face down is revealed. you win if all the cards are in their place and lose otherwise.",
	"If you enter a room where someone is already playing you will spectate the game but will not be able to influence anything."
]

/**
 * @param {SocketIO.Socket} socket
 * @param {SocketIO.Namespace} nsp
 */
function disconnect(socket, nsp) {
	return () => {
		const n = Object.keys(nsp.sockets).length
		console.log(`${socket.id} left solitaire - ${n} connected`)
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
		if (!room) return console.error(`Invalid room ${roomName}`)
		const { state, sockets } = room
		if (state.player != socket.id)
			return console.error("Spectators can't play")
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
		if (!room) return console.error(`Invalid room ${roomName}`)
		const { state, sockets } = room
		if (state.player != socket.id)
			return console.error("Spectators can't play")
		const correct = {
			rank: 1,
			suit: suits[i]
		}
		if (!Deck.equals(state.hand, correct))
			return console.error(
				`Invalid swap in room ${roomName}. Expected a ${Deck.stringifyCard(
					correct
				)} but got a ${Deck.stringifyCard(state.hand)} instead`
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
		if (!room) return console.error(`Invalid room ${roomName}`)
		const { state, sockets } = room
		if (state.player != socket.id)
			return console.error("Spectators can't play")
		const correct = {
			suit: suits[Math.floor(i / 7)],
			rank: (i % 7) + 7
		}
		if (!Deck.equals(state.hand, correct))
			return console.error(
				`Invalid swap in room ${roomName}. Expected a ${Deck.stringifyCard(
					correct
				)} but got a ${Deck.stringifyCard(state.hand)} instead`
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
			console.log(`Sent state of room ${roomName} to ${socket.id}`)
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
		console.log(`${socket.id} joined room ${roomName}`)
		if (!rooms.has(roomName)) {
			rooms.set(roomName, makeRoom(socket))
			console.log(`Created room ${roomName}`)
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
			console.log(`${room.sockets.length} player(s) in room ${roomName}`)
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
		console.log(`${socket.id} left room ${roomName}`)
		if (rooms.has(roomName)) {
			const room = rooms.get(roomName)
			if (room.sockets.length == 1) {
				rooms.delete(roomName)
				console.log(`Destroyed room ${roomName}`)
			} else {
				const room = rooms.get(roomName)
				const { state, sockets } = room
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
				console.log(
					`${room.sockets.length} player(s) in room ${roomName}`
				)
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

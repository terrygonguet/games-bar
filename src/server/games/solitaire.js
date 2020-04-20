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
 */

/**
 * @param {io.Namespace} nsp
 */
export default function(nsp) {
	nsp.on("connect", socket => {
		const n = Object.keys(nsp.sockets).length
		console.log(`${socket.id} joined solitaire - ${n} connected`)

		socket.on("disconnect", () => {
			const n = Object.keys(nsp.sockets).length
			console.log(`${socket.id} left solitaire - ${n} connected`)
		})

		socket.on("join", room => {
			if (!rooms.has(room)) rooms.set(room, makeState())
			socket.join(room)
			console.log(`${socket.id} joined room ${room}`)
		})

		socket.on("leave", room => {
			socket.leave(room)
			console.log(`${socket.id} left room ${room}`)
			if (rooms.has(room)) rooms.delete(room)
		})

		socket.on("get_initial_state", (room, ack) => {
			if (Object.keys(socket.rooms).includes(room) && rooms.has(room))
				ack(rooms.get(room))
		})

		socket.on("swap_card", (room, i) => {
			const state = rooms.get(room)
			if (!state) return console.error(`Invalid room ${room}`)
			const patches = []
			const correct = {
				suit: suits[Math.floor(i / 7)],
				rank: (i % 7) + 7
			}
			if (!Deck.equals(state.hand, correct))
				return console.error(
					`Invalid swap in room ${room}. Expected a ${Deck.stringifyCard(
						correct
					)} but got a ${Deck.stringifyCard(state.hand)} instead`
				)

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
			socket.emit("apply_patches", patches)
			rooms.set(room, next)
		})

		socket.on("place_ace", (room, i) => {
			const state = rooms.get(room)
			if (!state) return console.error(`Invalid room ${room}`)
			const patches = []
			const correct = {
				rank: 1,
				suit: suits[i]
			}
			if (!Deck.equals(state.hand, correct))
				return console.error(
					`Invalid swap in room ${room}. Expected a ${Deck.stringifyCard(
						correct
					)} but got a ${Deck.stringifyCard(state.hand)} instead`
				)

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
			socket.emit("apply_patches", patches)
			rooms.set(room, next)
		})
	})
}

/** @type {Map<string, State>} */
const rooms = new Map()

/**
 * @returns {State}
 */
function makeState() {
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
		reserve,
		grid,
		hand: Deck.drawOne(deck, true),
		aces: Array(4).fill(null),
		state: "playing"
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

import io from "socket.io"
import { Deck, suits } from "./deck"
import produce from "immer"
import logger from "~server/logger"

const { log, logRoom: rlog } = logger("petitbac")

/**
 * @typedef {Object} State
 * @property {number} round
 * @property {number} time
 * @property {Object<string,Player>} players
 * @property {string[]} categories
 * @property {string[]} letters
 * @property {string} king
 * @property {"preparing"|"thinking"|"scoring"} state
 */

/**
 * @typedef {Object} Player
 * @property {number} points
 * @property {Round[]} rounds
 * @property {string} name
 */

/**
 * @typedef {Object} Round
 * @property {string} letter
 * @property {string[]} words
 * @property {boolean[]} uniques
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
		log(`${socket.id} joined - ${n} connected`)

		socket.on("disconnect", disconnect(socket, nsp))

		socket.on("join", joinRoom(socket, nsp))

		socket.on("leave", leaveRoom(socket, nsp))

		socket.on("get_initial_state", getInitialState(socket, nsp))

		socket.on("choose_name", chooseName(socket, nsp))

		socket.on("set_categories", setCategories(socket, nsp))

		socket.on("start_round", startRound(socket, nsp))
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
		log(`${socket.id} left - ${n} connected`)
		for (const [roomName, { state, sockets }] of rooms.entries()) {
			if (sockets.includes(socket)) leaveRoom(socket, nsp)(roomName)
		}
	}
}

/**
 * @param {SocketIO.Socket} socket
 * @param {SocketIO.Namespace} nsp
 * @returns {(roomName: string, ack: (state: State) => void) => void}
 */
function getInitialState(socket, nsp) {
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
 * @param {SocketIO.Namespace} nsp
 * @returns {(roomName: string) => void}
 */
function joinRoom(socket, nsp) {
	return roomName => {
		socket.join(roomName)
		if (!rooms.has(roomName)) {
			rooms.set(roomName, makeRoom(socket))
			rlog(roomName, `Created room`)
			rlog(roomName, `${socket.id} joined`, { level: "verbose" })
		} else {
			const room = rooms.get(roomName)
			const { state, sockets } = room
			sockets.push(socket)
			rlog(roomName, `${socket.id} joined`, { level: "verbose" })
			rlog(roomName, `${room.sockets.length} player(s) in room`, {
				level: "verbose"
			})
		}
	}
}

/**
 * @param {SocketIO.Socket} socket
 * @param {SocketIO.Namespace} nsp
 * @returns {(roomName: string) => void}
 */
function leaveRoom(socket, nsp) {
	return roomName => {
		socket.leave(roomName)
		rlog(roomName, `${socket.id} left`, { level: "verbose" })
		if (rooms.has(roomName)) {
			const room = rooms.get(roomName)
			if (room.sockets.length == 1) {
				rooms.delete(roomName)
				rlog(roomName, `Destroyed room`)
			} else {
				room.sockets = room.sockets.filter(s => s !== socket)
				rlog(roomName, `${room.sockets.length} player(s) in room`, {
					level: "verbose"
				})
				room.state = produce(
					room.state,
					draft => {
						if (room.state.king == socket.id) {
							const ids = Object.keys(draft.players)
							draft.king =
								ids[Math.floor(Math.random() * ids.length)]
							rlog(
								roomName,
								`${draft.king} is now king of the room`,
								{
									level: "verbose"
								}
							)
						}
						delete draft.players[socket.id]
					},
					p => nsp.to(roomName).emit("apply_patches", p)
				)
			}
		}
	}
}

/**
 * @param {SocketIO.Socket} socket
 * @param {SocketIO.Namespace} nsp
 * @returns {(roomName: string, name: string) => void}
 */
function chooseName(socket, nsp) {
	return (roomName, name) => {
		const room = rooms.get(roomName)
		if (!room) return log(`Invalid room ${roomName}`, { level: "error" })
		const { state } = room
		if (!name)
			return rlog(
				roomName,
				`Can't have an empty string as a name, ${socket.id}`,
				{ level: "verbose" }
			)
		if (Object.values(state.players).some(p => p.name == name))
			return rlog(roomName, `There is already a player named ${name}`, {
				level: "verbose"
			})

		room.state = produce(
			state,
			draft => {
				if (socket.id in draft.players)
					draft.players[socket.id].name = name
				else draft.players[socket.id] = makePlayer(name)
				if (draft.state != "preparing") {
					const letter = draft.letters[draft.letters.length - 1]
					draft.players[socket.id].rounds.push(makeRound(letter))
				}
			},
			p => nsp.to(roomName).emit("apply_patches", p)
		)

		rlog(roomName, `Given name ${name} to ${socket.id}`, {
			level: "verbose"
		})
	}
}

/**
 * @param {SocketIO.Socket} socket
 * @param {SocketIO.Namespace} nsp
 * @returns {(roomName: string, categories: string[]) => void}
 */
function setCategories(socket, nsp) {
	return (roomName, categories) => {
		const room = rooms.get(roomName)
		if (!room) return log(`Invalid room ${roomName}`, { level: "error" })
		const { state } = room
		if (state.king !== socket.id)
			return rlog(roomName, "Only the king can change the categories", {
				level: "verbose"
			})
		if (
			!Array.isArray(categories) ||
			!categories.every(c => typeof c == "string")
		)
			return rlog(
				roomName,
				`Invalid data supplied: ${JSON.stringify(categories)}`,
				{ level: "error" }
			)

		room.state = produce(
			state,
			draft => void (draft.categories = categories),
			p => nsp.to(roomName).emit("apply_patches", p)
		)

		rlog(roomName, `Set the categories to [${categories}]`, {
			level: "verbose"
		})
	}
}

/**
 * @param {SocketIO.Socket} socket
 * @param {SocketIO.Namespace} nsp
 * @returns {(roomName: string) => void}
 */
function startRound(socket, nsp) {
	return (roomName, categories) => {
		const room = rooms.get(roomName)
		if (!room) return log(`Invalid room ${roomName}`, { level: "error" })
		const { state } = room
		if (state.king !== socket.id)
			return rlog(roomName, "Only the king can start a round", {
				level: "verbose"
			})

		room.state = produce(
			state,
			draft => {
				draft.state = "thinking"
				draft.round++
				let unpicked = letters.filter(l => !draft.letters.includes(l))
				if (unpicked.length == 0) {
					draft.letters = []
					unpicked = letters
				}
				const picked =
					unpicked[Math.floor(Math.random() * unpicked.length)]
				draft.letters.push(picked)
				Object.values(draft.players).forEach(p =>
					p.rounds.push(makeRound(picked))
				)
				rlog(roomName, `Started a round with the letter ${picked}`, {
					level: "verbose"
				})
			},
			p => nsp.to(roomName).emit("apply_patches", p)
		)
	}
}

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")

/**
 * @param {SocketIO.Socket} socket
 * @returns {Room}
 */
function makeRoom(socket) {
	return {
		state: {
			round: 0,
			state: "preparing",
			players: {},
			categories: [
				"Pays",
				"Prénoms",
				"Animaux",
				"Métiers",
				"Villes",
				"Séries / Films",
				"Choses / Objets",
				"Fruits et/ou légumes",
				"Marques",
				"Outils",
				"Capitales",
				"Instruments de musique",
				"Plats",
				"Personnages historiques"
			],
			letters: [],
			king: socket.id
		},
		sockets: [socket]
	}
}

/**
 * @param {string} name
 * @returns {Player}
 */
function makePlayer(name) {
	return {
		name,
		points: 0,
		rounds: []
	}
}

/**
 * @param {string} letter
 * @returns {Round}
 */
function makeRound(letter) {
	return {
		letter,
		uniques: [],
		words: []
	}
}

import io from "socket.io"
import { Deck, suits } from "./deck"
import produce from "immer"
import logger from "~server/logger"
import { last } from "~tools"

const { log, logRoom: rlog } = logger("petitbac")

/**
 * @typedef {Object} State
 * @property {Object<string,Player>} players
 * @property {string[]} categories
 * @property {string} king
 * @property {"preparing"|"thinking"|"scoring"|"scoreboard"} state
 * @property {Round[]} rounds
 * @property {boolean} everybodyCanRefuse
 */

/**
 * @typedef {Object} Player
 * @property {number} score
 * @property {string} name
 */

/**
 * @typedef {Object} Round
 * @property {string} letter
 * @property {Object<string,string[]>} words
 * @property {string} fastest
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

		socket.on("set_refuse", setRefuse(socket, nsp))

		socket.on("start_round", startRound(socket, nsp))

		socket.on("finish_round", finishRound(socket, nsp))

		socket.on("set_words", setWords(socket, nsp))

		socket.on("refuse_word", refuseWord(socket, nsp))

		socket.on("compute_score", computeScore(socket, nsp))
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
						draft.rounds.forEach(r => delete r.words[socket.id])
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
		if (state.state !== "preparing")
			return rlog(
				roomName,
				"The categories can only be changed in the 'preparing' state",
				{
					level: "verbose"
				}
			)
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
 * @returns {(roomName: string, value: boolean) => void}
 */
function setRefuse(socket, nsp) {
	return (roomName, value) => {
		const room = rooms.get(roomName)
		if (!room) return log(`Invalid room ${roomName}`, { level: "error" })
		const { state } = room
		if (state.king !== socket.id)
			return rlog(roomName, "Only the king can change this option", {
				level: "verbose"
			})
		if (state.state !== "preparing")
			return rlog(
				roomName,
				"This setting can only be changed in the 'preparing' state",
				{
					level: "verbose"
				}
			)

		room.state = produce(
			state,
			draft => void (draft.everybodyCanRefuse = !!value),
			p => nsp.to(roomName).emit("apply_patches", p)
		)

		rlog(roomName, `Set the setting everybodyCanRefuse to ${!!value}`, {
			level: "verbose"
		})
	}
}

/**
 * @param {SocketIO.Socket} socket
 * @param {SocketIO.Namespace} nsp
 * @returns {(roomName: string, categories: string[]) => void}
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
		if (state.state === "thinking")
			return rlog(roomName, "The round has already started", {
				level: "verbose"
			})

		room.state = produce(
			state,
			draft => {
				draft.state = "thinking"
				const letter =
					letters[Math.floor(Math.random() * letters.length)]
				draft.rounds.push(
					makeRound(
						letter,
						Object.keys(draft.players),
						draft.categories.length
					)
				)
				rlog(roomName, `Started a round with the letter ${letter}`, {
					level: "verbose"
				})
			},
			p => nsp.to(roomName).emit("apply_patches", p)
		)
	}
}

/**
 * @param {SocketIO.Socket} socket
 * @param {SocketIO.Namespace} nsp
 * @returns {(roomName: string, words: string[]) => void}
 */
function finishRound(socket, nsp) {
	return (roomName, words) => {
		const room = rooms.get(roomName)
		if (!room) return log(`Invalid room ${roomName}`, { level: "error" })
		const { state } = room
		if (
			!Array.isArray(words) ||
			words.length != state.categories.length ||
			!words.every(w => typeof w == "string")
		)
			return rlog(roomName, "Invalid data submitted", {
				level: "verbose"
			})
		if (!words.every(Boolean) && words.length == state.categories.length)
			return rlog(
				roomName,
				"A player can only finish if they have a word for all categories",
				{
					level: "verbose"
				}
			)
		if (state.state !== "thinking")
			return rlog(
				roomName,
				"Cannot finish a round that hasn't started yet",
				{
					level: "verbose"
				}
			)

		room.state = produce(
			state,
			draft => {
				draft.state = "scoring"
				const round = last(draft.rounds)
				round.fastest = socket.id
				round.words[socket.id] = words

				rlog(roomName, `${socket.id} finished the round`, {
					level: "verbose"
				})
			},
			p => nsp.to(roomName).emit("apply_patches", p)
		)
	}
}

/**
 * @param {SocketIO.Socket} socket
 * @param {SocketIO.Namespace} nsp
 * @returns {(roomName: string, words: string[]) => void}
 */
function setWords(socket, nsp) {
	return (roomName, words) => {
		const room = rooms.get(roomName)
		if (!room) return log(`Invalid room ${roomName}`, { level: "error" })
		const { state } = room
		if (state.state !== "thinking")
			return rlog(roomName, "Cannot submit words outside rounds", {
				level: "verbose"
			})
		if (
			!Array.isArray(words) ||
			words.length != state.categories.length ||
			!words.every(w => typeof w == "string")
		)
			return rlog(roomName, "Invalid data submitted", {
				level: "verbose"
			})

		room.state = produce(
			state,
			draft => {
				const round = last(draft.rounds)
				if (!(socket.id in round.words)) round.words[socket.id] = []
				const curWords = round.words[socket.id]
				for (let i = 0; i < words.length; i++) {
					if (words[i] != curWords[i]) curWords[i] = words[i]
				}
			},
			p => nsp.to(roomName).emit("apply_patches", p)
		)
	}
}

/**
 * @param {SocketIO.Socket} socket
 * @param {SocketIO.Namespace} nsp
 * @returns {(roomName: string, id: string, i: number) => void}
 */
function refuseWord(socket, nsp) {
	return (roomName, id, i) => {
		const room = rooms.get(roomName)
		if (!room) return log(`Invalid room ${roomName}`, { level: "error" })
		const { state } = room
		if (state.state !== "scoring")
			return rlog(
				roomName,
				"Cannot refuse a word outside of the 'scoring' state",
				{
					level: "verbose"
				}
			)
		if (!state.everybodyCanRefuse && state.king != socket.id)
			return rlog(
				roomName,
				"Only the king can refuse words when everybodyCanRefuse is false",
				{
					level: "verbose"
				}
			)
		if (!(id in last(state.rounds).words))
			return rlog(roomName, `ID ${id} isn't playing this round`, {
				level: "verbose"
			})

		room.state = produce(
			state,
			draft => {
				const round = last(draft.rounds)
				round.words[id][i] = ""
			},
			p => nsp.to(roomName).emit("apply_patches", p)
		)
	}
}

/**
 * @param {SocketIO.Socket} socket
 * @param {SocketIO.Namespace} nsp
 * @returns {(roomName: string) => void}
 */
function computeScore(socket, nsp) {
	return roomName => {
		const room = rooms.get(roomName)
		if (!room) return log(`Invalid room ${roomName}`, { level: "error" })
		const { state } = room
		if (state.state !== "scoring")
			return rlog(
				roomName,
				"Cannot compute score outside of the 'scoring' state",
				{
					level: "verbose"
				}
			)
		if (state.king != socket.id)
			return rlog(
				roomName,
				"Only the king can decide to compute the scores",
				{
					level: "verbose"
				}
			)

		room.state = produce(
			state,
			draft => {
				draft.state = "scoreboard"

				const round = last(draft.rounds)
				const wordsEntries = Object.entries(round.words)
				const sanitized = wordsEntries.map(([id, words]) => [
					id,
					words.map(w => w.trim().toLocaleLowerCase())
				])

				/**
				 * @param {string} word
				 * @param {number} i
				 */
				function nbMatchesAt(word, i) {
					let total = 0
					for (const [, l] of sanitized) {
						if (l[i] == word) total++
					}
					return total
				}

				for (const [id, words] of sanitized) {
					draft.players[id].score += words
						.map((w, i) => Boolean(w) && nbMatchesAt(w, i) == 1)
						.reduce((acc, cur) => acc + cur, 0)
				}
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
			rounds: [],
			king: socket.id,
			everybodyCanRefuse: true
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
		score: 0
	}
}

/**
 * @param {string} letter
 * @param {string[]} players
 * @param {number} nbCategories
 * @returns {Round}
 */
function makeRound(letter, players, nbCategories) {
	return {
		letter,
		words: Object.fromEntries(
			players.map(p => [p, Array(nbCategories).fill("")])
		),
		fastest: ""
	}
}

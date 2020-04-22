import io from "socket.io"
import { Deck, suits } from "./deck"
import produce from "immer"
import logger from "~server/logger"

const { log, error, logRoom: rlog, errorRoom: rerror } = logger("chess")

/**
 * @typedef {Object} State
 * @property {number[]} board
 * @property {string} player1
 * @property {string} player2
 * @property {number} turn
 * @property {"choosing"|"playing"|"end"} state
 * @property {number} selected
 * @property {number[]} p1caught
 * @property {number[]} p2caught
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

		socket.on("join", joinRoom(socket))

		socket.on("leave", leaveRoom(socket))

		socket.on("get_initial_state", getInitialState(socket))

		socket.on("choose_side", chooseSide(socket, nsp))
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
			if (sockets.includes(socket)) leaveRoom(socket)(roomName)
		}
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
			rlog(roomName, `Sent state of room to ${socket.id}`)
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
			rlog(roomName, `${socket.id} joined`)
		} else {
			const room = rooms.get(roomName)
			const { state, sockets } = room
			sockets.push(socket)
			rlog(roomName, `${socket.id} joined`)
			rlog(roomName, `${room.sockets.length} player(s) in room`)
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
		rlog(roomName, `${socket.id} left`)
		if (rooms.has(roomName)) {
			const room = rooms.get(roomName)
			if (room.sockets.length == 1) {
				rooms.delete(roomName)
				rlog(roomName, `Destroyed room`)
			} else {
				const room = rooms.get(roomName)
				room.sockets = sockets.filter(s => s !== socket)
				log(roomName, `${room.sockets.length} player(s) in room`)
			}
		}
	}
}

/**
 * @param {SocketIO.Socket} socket
 * @param {SocketIO.Namespace} nsp
 * @returns {(roomName: string, i: number) => void}
 */
function chooseSide(socket, nsp) {
	return (roomName, i) => {
		const room = rooms.get(roomName)
		if (!room) return error(`Invalid room ${roomName}`)
		const { state, sockets } = room
		const key = "player" + i
		if (state[key])
			return rerror(roomName, `There already is a player ${i}`)

		const patches = []
		const next = produce(
			state,
			draft => {
				draft[key] = socket.id
				if (draft.player1 && draft.player2) draft.state = "playing"
			},
			p => patches.push(...p)
		)

		nsp.to(roomName).emit("apply_patches", patches)
		rooms.set(roomName, { state: next, sockets })
		rlog(roomName, `${socket.id} is now player ${i}`)
		if (next.state == "playing") rlog(roomName, `The game has started!`)
	}
}

/**
 * @param {SocketIO.Socket} socket
 * @returns {Room}
 */
function makeRoom(socket) {
	return {
		state: {
			board: makeBoard(),
			p1caught: [],
			p2caught: [],
			player1: "",
			player2: "",
			selected: -1,
			state: "choosing",
			turn: 0
		},
		sockets: [socket]
	}
}

const pieces = [
	"white_pawn",
	"white_rook",
	"white_knight",
	"white_bishop",
	"white_queen",
	"white_king",
	"black_pawn",
	"black_rook",
	"black_knight",
	"black_bishop",
	"black_queen",
	"black_king"
]

function makeBoard() {
	return [
		7,
		8,
		9,
		10,
		11,
		9,
		8,
		7,
		6,
		6,
		6,
		6,
		6,
		6,
		6,
		6,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		1,
		2,
		3,
		4,
		5,
		3,
		2,
		1
	]
}

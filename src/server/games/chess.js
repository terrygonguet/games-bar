import io from "socket.io"
import { Deck, suits } from "./deck"
import produce from "immer"
import logger from "~server/logger"

const { log, logRoom: rlog } = logger("chess")

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

		socket.on("select", select(socket, nsp))

		socket.on("move", move(socket, nsp))
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
				room.sockets = room.sockets.filter(s => s !== socket)
				log(roomName, `${room.sockets.length} player(s) in room`, {
					level: "verbose"
				})
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
		if (!room) return log(`Invalid room ${roomName}`, { level: "error" })
		const { state, sockets } = room
		const key = "player" + i
		if (state.player1 == socket.id || state.player2 == socket.id)
			return rlog(roomName, `${socket.id} has already chosen a side`, {
				level: "verbose"
			})
		if (state[key])
			return rlog(
				roomName,
				`${socket.id} tried to become player ${i} but there already is one`,
				{ level: "verbose" }
			)

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
		rlog(roomName, `${socket.id} is now player ${i}`, { level: "verbose" })
		if (next.state == "playing")
			rlog(roomName, `The game has started!`, { level: "verbose" })
	}
}

/**
 * @param {SocketIO.Socket} socket
 * @param {SocketIO.Namespace} nsp
 * @returns {(roomName: string, i: number) => void}
 */
function select(socket, nsp) {
	return (roomName, i) => {
		const room = rooms.get(roomName)
		if (!room) return log(`Invalid room ${roomName}`, { level: "error" })
		const { state, sockets } = room
		if (!isYourTurn(state, socket.id))
			return rlog(roomName, `It is not the turn of ${socket.id}`, {
				level: "verbose"
			})
		if (i != -1 && !isYourPiece(state, socket.id, i))
			return rlog(
				roomName,
				`Piece at ${i} doesn't belong to ${socket.id}`,
				{ level: "verbose" }
			)
		if (state.board[i] === null)
			return rlog(
				roomName,
				`${socket.id} cannot select an empty cell at ${i}`,
				{ level: "verbose" }
			)

		const patches = []
		const next = produce(
			state,
			draft => void (draft.selected = i),
			p => patches.push(...p)
		)

		nsp.to(roomName).emit("apply_patches", patches)
		rooms.set(roomName, { state: next, sockets })
	}
}

/**
 * @param {SocketIO.Socket} socket
 * @param {SocketIO.Namespace} nsp
 * @returns {(roomName: string, from: number, to: number) => void}
 */
function move(socket, nsp) {
	return (roomName, from, to) => {
		const room = rooms.get(roomName)
		if (!room) return log(`Invalid room ${roomName}`, { level: "error" })
		const { state, sockets } = room
		if (!isYourTurn(state, socket.id))
			return rlog(roomName, `It is not the turn of ${socket.id}`, {
				level: "verbose"
			})

		const patches = []
		const next = produce(
			state,
			draft => {
				draft.selected = -1
				const a = [from % 8, Math.floor(from / 8), from]
				const b = [to % 8, Math.floor(to / 8), to]
				const piece = state.board[from]
				if (canMove[piece](a, b, state.board)) {
					draft.board[to] = piece
					draft.board[from] = null
					draft.turn++
				} else
					rlog(
						roomName,
						`${socket.id} attempted an invalid move from ${from} to ${to}`,
						{ level: "verbose" }
					)
			},
			p => patches.push(...p)
		)

		nsp.to(roomName).emit("apply_patches", patches)
		rooms.set(roomName, { state: next, sockets })
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
			turn: 1
		},
		sockets: [socket]
	}
}

const pieces = [
	"white-pawn",
	"white-rook",
	"white-knight",
	"white-bishop",
	"white-queen",
	"white-king",
	"black-pawn",
	"black-rook",
	"black-knight",
	"black-bishop",
	"black-queen",
	"black-king"
]

/** @typedef {[number,number,number]} Pos */

/** @typedef {(from: Pos, to: Pos, board: number[]) => boolean} MoveValidator */

/** @type {MoveValidator[]} */
const canMove = [
	// white pawn
	function([x1, y1, i], [x2, y2, j], board) {
		if (x2 > 7 || x2 < 0 || y2 > 7 || y2 >= y1) return false
		// first move
		if (y1 == 6 && y2 == y1 - 2 && x1 == x2)
			return isEmpty(board[j]) && isEmpty(board[y1 * 8 - 8 + x1])
		if (Math.abs(x1 - x2) > 1 || y2 != y1 - 1) return false
		if (x1 == x2) return isEmpty(board[j])
		else return isBlack(board[j])
	},
	// white-rook
	function([x1, y1, i], [x2, y2, j], board) {
		if (x2 > 7 || x2 < 0 || y2 > 7 || y2 < 0) return false
		if ((x1 != x2 && y1 != y2) || (x1 == x2 && y1 == y2)) return false
		if (x1 == x2) {
			const delta = Math.sign(y2 - y1)
			for (let k = y1 + delta; k < y2; k += delta)
				if (!isEmpty(board[k * 8 + x1])) return false
		} else {
			const delta = Math.sign(x2 - x1)
			for (let k = x1 + delta; k < x2; k += delta)
				if (!isEmpty(board[y1 * 8 + k])) return false
		}
		return isEmpty(board[j]) || isBlack(board[j])
	},
	// white-knight
	() => false,
	// white-bishop
	function([x1, y1, i], [x2, y2, j], board) {
		if (x2 > 7 || x2 < 0 || y2 > 7 || y2 < 0 || i == j) return false
		const dx = x2 - x1,
			dy = y2 - y1,
			sx = Math.sign(dx),
			sy = Math.sign(dy)
		if (Math.abs(dx) == Math.abs(dy)) {
			let x = x1 + sx,
				y = y1 + sy
			while (x != x2 && y != y2) {
				if (!isEmpty(board[y * 8 + x])) return false
				x += sx
				y += sy
			}
			return isEmpty(board[j]) || isBlack(board[j])
		} else return false
	},
	// white-queen
	function([x1, y1, i], [x2, y2, j], board) {
		if (x2 > 7 || x2 < 0 || y2 > 7 || y2 < 0 || i == j) return false
		const dx = x2 - x1,
			dy = y2 - y1,
			sx = Math.sign(dx),
			sy = Math.sign(dy)
		if (x1 == x2 || y1 == y2 || Math.abs(dx) == Math.abs(dy)) {
			let x = x1 + sx,
				y = y1 + sy
			while (x != x2 && y != y2) {
				if (!isEmpty(board[y * 8 + x])) return false
				x += sx
				y += sy
			}
			return isEmpty(board[j]) || isBlack(board[j])
		} else return false
	},
	// white-king
	function([x1, y1, i], [x2, y2, j], board) {
		if (x2 > 7 || x2 < 0 || y2 > 7 || y2 < 0 || i == j) return false
		if (Math.abs(x2 - x1) <= 1 && Math.abs(y2 - y1) <= 1)
			return isEmpty(board[j]) || isBlack(board[j])
		else return false
	},
	// black-pawn
	function([x1, y1, i], [x2, y2, j], board) {
		if (x2 > 7 || x2 < 0 || y2 > 7 || y2 <= y1) return false
		// first move
		if (y1 == 1 && y2 == y1 + 2 && x1 == x2)
			return isEmpty(board[j]) && isEmpty(board[y1 * 8 + 8 + x1])
		if (Math.abs(x1 - x2) > 1 || y2 != y1 + 1) return false
		if (x1 == x2) return isEmpty(board[j])
		else return isWhite(board[j])
	},
	// black-rook
	function([x1, y1, i], [x2, y2, j], board) {
		if (x2 > 7 || x2 < 0 || y2 > 7 || y2 < 0) return false
		if ((x1 != x2 && y1 != y2) || (x1 == x2 && y1 == y2)) return false
		if (x1 == x2) {
			const delta = Math.sign(y2 - y1)
			for (let k = y1 + delta; k < y2; k += delta)
				if (!isEmpty(board[k * 8 + x1])) return false
		} else {
			const delta = Math.sign(x2 - x1)
			for (let k = x1 + delta; k < x2; k += delta)
				if (!isEmpty(board[y1 * 8 + k])) return false
		}
		return isEmpty(board[j]) || isWhite(board[j])
	},
	// black-knight
	() => false,
	// black-bishop
	function([x1, y1, i], [x2, y2, j], board) {
		if (x2 > 7 || x2 < 0 || y2 > 7 || y2 < 0 || i == j) return false
		const dx = x2 - x1,
			dy = y2 - y1,
			sx = Math.sign(dx),
			sy = Math.sign(dy)
		if (Math.abs(dx) == Math.abs(dy)) {
			let x = x1 + sx,
				y = y1 + sy
			while (x != x2 && y != y2) {
				if (!isEmpty(board[y * 8 + x])) return false
				x += sx
				y += sy
			}
			return isEmpty(board[j]) || isWhite(board[j])
		} else return false
	},
	// black-queen
	function([x1, y1, i], [x2, y2, j], board) {
		if (x2 > 7 || x2 < 0 || y2 > 7 || y2 < 0 || i == j) return false
		const dx = x2 - x1,
			dy = y2 - y1,
			sx = Math.sign(dx),
			sy = Math.sign(dy)
		if (x1 == x2 || y1 == y2 || Math.abs(dx) == Math.abs(dy)) {
			let x = x1 + sx,
				y = y1 + sy
			while (x != x2 && y != y2) {
				if (!isEmpty(board[y * 8 + x])) return false
				x += sx
				y += sy
			}
			return isEmpty(board[j]) || isWhite(board[j])
		} else return false
	},
	// black-king
	function([x1, y1, i], [x2, y2, j], board) {
		if (x2 > 7 || x2 < 0 || y2 > 7 || y2 < 0 || i == j) return false
		if (Math.abs(x2 - x1) <= 1 && Math.abs(y2 - y1) <= 1)
			return isEmpty(board[j]) || isWhite(board[j])
		else return false
	}
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

/**
 * @param {State} state
 * @param {string} id
 */
function isYourTurn(state, id) {
	const isWhiteTurn = state.turn % 2
	return isWhiteTurn ? id == state.player1 : id == state.player2
}

/**
 * @param {State} state
 * @param {string} id
 * @param {number} i
 */
function isYourPiece(state, id, i) {
	if (id == state.player1) return isWhite(state.board[i])
	else if (id == state.player2) return isBlack(state.board[i])
	else return false
}

/**
 * @param {number} piece
 */
function isWhite(piece) {
	return piece !== null && piece <= 5
}

/**
 * @param {number} piece
 */
function isBlack(piece) {
	return piece !== null && piece > 5
}

/**
 * @param {number} piece
 */
function isEmpty(piece) {
	return piece === null
}

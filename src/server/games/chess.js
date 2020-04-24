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
 * @property {{ from: number, to: number }} lastMove
 * @property {boolean} check
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
				rlog(roomName, `${room.sockets.length} player(s) in room`, {
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
					draft.board[from] = null
					const eaten = draft.board[to]
					draft.board[to] = piece

					if (isCurrentInCheck(draft.board, draft.turn)) {
						// revert move
						draft.board[from] = piece
						draft.board[to] = eaten
						return rlog(roomName, "Can't end your turn in check", {
							level: "verbose"
						})
					}

					if (isBlack(eaten)) draft.p1caught.push(eaten)
					else if (isWhite(eaten)) draft.p2caught.push(eaten)
					// promotion
					if (piece === 1 && b[1] == 0) {
						draft.board[to] = 5
						rlog(roomName, "White promoted a pawn to queen!", {
							level: "verbose"
						})
					} else if (piece === 7 && b[1] == 7) {
						draft.board[to] = 11
						rlog(roomName, "Black promoted a pawn to queen!", {
							level: "verbose"
						})
					}
					draft.check = isOpponentInCheck(draft.board, draft.turn)
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
			turn: 1,
			lastMove: { from: -1, to: -1 },
			check: false
		},
		sockets: [socket]
	}
}

/** @typedef {[number,number,number]} Pos */

/** @typedef {(from: Pos, to: Pos, board: number[]) => boolean} MoveValidator */

/** @type {MoveValidator[]} */
const canMove = [
	// empty spot
	() => false,
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
	function([x1, y1, i], [x2, y2, j], board) {
		if (x2 > 7 || x2 < 0 || y2 > 7 || y2 < 0 || i == j) return false
		if (
			(x1 + 2 == x2 && y1 + 1 == y2) ||
			(x1 + 2 == x2 && y1 - 1 == y2) ||
			(x1 - 2 == x2 && y1 + 1 == y2) ||
			(x1 - 2 == x2 && y1 - 1 == y2) ||
			(x1 + 1 == x2 && y1 + 2 == y2) ||
			(x1 + 1 == x2 && y1 - 2 == y2) ||
			(x1 - 1 == x2 && y1 + 2 == y2) ||
			(x1 - 1 == x2 && y1 - 2 == y2)
		)
			return isEmpty(board[j]) || isBlack(board[j])
	},
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
	function([x1, y1, i], [x2, y2, j], board) {
		if (x2 > 7 || x2 < 0 || y2 > 7 || y2 < 0 || i == j) return false
		if (
			(x1 + 2 == x2 && y1 + 1 == y2) ||
			(x1 + 2 == x2 && y1 - 1 == y2) ||
			(x1 - 2 == x2 && y1 + 1 == y2) ||
			(x1 - 2 == x2 && y1 - 1 == y2) ||
			(x1 + 1 == x2 && y1 + 2 == y2) ||
			(x1 + 1 == x2 && y1 - 2 == y2) ||
			(x1 - 1 == x2 && y1 + 2 == y2) ||
			(x1 - 1 == x2 && y1 - 2 == y2)
		)
			return isEmpty(board[j]) || isWhite(board[j])
	},
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
		8,
		9,
		10,
		11,
		12,
		10,
		9,
		8,
		7,
		7,
		7,
		7,
		7,
		7,
		7,
		7,
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
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		2,
		3,
		4,
		5,
		6,
		4,
		3,
		2
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
	return piece !== null && piece <= 6
}

/**
 * @param {number} piece
 */
function isBlack(piece) {
	return piece !== null && piece > 6
}

/**
 * @param {number} piece
 */
function isEmpty(piece) {
	return !piece
}

/**
 * @param {number[]} board
 */
function isBlackInCheck(board) {
	const i = board.indexOf(12)
	const j = board.indexOf(6)
	if (i == -1 || j == -1) return false
	const x = i % 8,
		y = Math.floor(i / 8)
	// king
	if (
		j == i + 7 ||
		j == i + 8 ||
		j == i + 9 ||
		j == i - 7 ||
		j == i - 8 ||
		j == i - 9 ||
		j == i + 1 ||
		j == i - 1
	)
		return true
	// pawns
	if (board[i + 7] == 1 || board[i + 9] == 1) return true
	// knights
	if (
		board[(y + 1) * 8 + x + 2] == 3 ||
		board[(y + 1) * 8 + x - 2] == 3 ||
		board[(y - 1) * 8 + x + 2] == 3 ||
		board[(y - 1) * 8 + x - 2] == 3 ||
		board[(y + 2) * 8 + x + 1] == 3 ||
		board[(y + 2) * 8 + x - 1] == 3 ||
		board[(y - 2) * 8 + x + 1] == 3 ||
		board[(y - 2) * 8 + x - 1] == 3
	)
		return true
	// other
	const straightThreats = [2, 5]
	const diagThreats = [4, 5]
	const closest = Array(8).fill(null)
	for (let k = 1; k < 8; k++) {
		const n = board[(y - k) * 8 + x]
		if (!closest[0] && n !== null) closest[0] = n
		const ne = board[(y - k) * 8 + x + k]
		if (!closest[1] && ne !== null) closest[1] = ne
		const e = board[y * 8 + x + k]
		if (!closest[2] && e !== null) closest[2] = e
		const se = board[(y + k) * 8 + x + k]
		if (!closest[3] && se !== null) closest[3] = se
		const s = board[(y + k) * 8 + x]
		if (!closest[4] && s !== null) closest[4] = s
		const sw = board[(y + k) * 8 + x - k]
		if (!closest[5] && sw !== null) closest[5] = sw
		const w = board[y * 8 + x - k]
		if (!closest[6] && w !== null) closest[6] = w
		const nw = board[(y - k) * 8 + x - k]
		if (!closest[7] && nw !== null) closest[7] = nw
		if (closest.every(Boolean)) break
	}
	return closest.some((c, i) =>
		(i % 2 ? diagThreats : straightThreats).includes(c)
	)
}

/**
 * @param {number[]} board
 */
function isWhiteInCheck(board) {
	const i = board.indexOf(6)
	const j = board.indexOf(12)
	if (i == -1 || j == -1) return false
	const x = i % 8,
		y = Math.floor(i / 8)
	// king
	if (
		j == i + 7 ||
		j == i + 8 ||
		j == i + 9 ||
		j == i - 7 ||
		j == i - 8 ||
		j == i - 9 ||
		j == i + 1 ||
		j == i - 1
	)
		return true
	// pawns
	if (board[i + 7] == 7 || board[i + 9] == 7) return true
	// knights
	if (
		board[(y + 1) * 8 + x + 2] == 9 ||
		board[(y + 1) * 8 + x - 2] == 9 ||
		board[(y - 1) * 8 + x + 2] == 9 ||
		board[(y - 1) * 8 + x - 2] == 9 ||
		board[(y + 2) * 8 + x + 1] == 9 ||
		board[(y + 2) * 8 + x - 1] == 9 ||
		board[(y - 2) * 8 + x + 1] == 9 ||
		board[(y - 2) * 8 + x - 1] == 9
	)
		return true
	// other
	const straightThreats = [8, 11]
	const diagThreats = [10, 11]
	const closest = Array(8).fill(null)
	for (let k = 1; k < 8; k++) {
		const n = board[(y - k) * 8 + x]
		if (!closest[0] && n !== null) closest[0] = n
		const ne = board[(y - k) * 8 + x + k]
		if (!closest[1] && ne !== null) closest[1] = ne
		const e = board[y * 8 + x + k]
		if (!closest[2] && e !== null) closest[2] = e
		const se = board[(y + k) * 8 + x + k]
		if (!closest[3] && se !== null) closest[3] = se
		const s = board[(y + k) * 8 + x]
		if (!closest[4] && s !== null) closest[4] = s
		const sw = board[(y + k) * 8 + x - k]
		if (!closest[5] && sw !== null) closest[5] = sw
		const w = board[y * 8 + x - k]
		if (!closest[6] && w !== null) closest[6] = w
		const nw = board[(y - k) * 8 + x - k]
		if (!closest[7] && nw !== null) closest[7] = nw
		if (closest.every(Boolean)) break
	}
	return closest.some((c, i) =>
		(i % 2 ? diagThreats : straightThreats).includes(c)
	)
}

/**
 * @param {number[]} board
 * @param {number} turn
 */
function isCurrentInCheck(board, turn) {
	return turn % 2 ? isWhiteInCheck(board) : isBlackInCheck(board)
}

/**
 * @param {number[]} board
 * @param {number} turn
 */
function isOpponentInCheck(board, turn) {
	return turn % 2 ? isBlackInCheck(board) : isWhiteInCheck(board)
}

const pieces = [
	"nothing",
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

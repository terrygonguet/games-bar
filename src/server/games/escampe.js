import io from "socket.io"
import produce from "immer"
import logger from "~server/logger"

const { log, logRoom: rlog } = logger("escampe")

/**
 * @typedef {Object} State
 * @property {[string, string]} players
 * @property {0|1|2|3} rotation
 * @property {Piece[]} pieces
 * @property {0|1} turn
 * @property {0|1|2|3} lastPlayed
 * @property {number} selected
 * @property {[ToPlace, ToPlace]} toPlace
 * @property {0|1|2|3|4|5} phase
 *     0: waiting for players,
 *     1: choose board orientation & black places,
 *     2: white places,
 *     3: playing,
 *     4: end
 */

/**
 * @typedef {Object} Piece
 * @property {number} position
 * @property {0|1} rank
 * @property {0|1} side
 */

/**
 * @typedef {Object} ToPlace
 * @property {number} unicorn
 * @property {number} paladin
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

		socket.on("set_rotation", setRotation(socket, nsp))

		socket.on("place_piece", placePiece(socket, nsp))

		socket.on("done_placing", donePlacing(socket, nsp))

		// socket.on("select", select(socket, nsp))

		// socket.on("move", move(socket, nsp))
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
		if (state.phase != 0)
			return rlog(
				roomName,
				`Can't choose a side after a game has started`,
				{ level: "verbose" }
			)
		if (typeof i != "number" || i < 0 || i > 1)
			return rlog(
				roomName,
				`Invalid data supplied to chooseSide by ${socket.id}`,
				{ level: "verbose" }
			)
		if (state.players[i])
			return rlog(roomName, `There is already a player ${i}`, {
				level: "verbose"
			})
		if (state.players.indexOf(socket.id) != -1)
			return rlog(roomName, `${socket.id} already is a player`, {
				level: "verbose"
			})
		room.state = produce(
			state,
			draft => {
				draft.players[i] = socket.id
				if (draft.players.every(Boolean)) draft.phase++
			},
			p => nsp.to(roomName).emit("apply_patches", p)
		)
		rlog(roomName, `${socket.id} is now player ${i}`, { level: "verbose" })
	}
}

/**
 * @param {SocketIO.Socket} socket
 * @param {SocketIO.Namespace} nsp
 * @returns {(roomName: string, angle: number) => void}
 */
function setRotation(socket, nsp) {
	return (roomName, angle) => {
		const room = rooms.get(roomName)
		if (!room) return log(`Invalid room ${roomName}`, { level: "error" })
		const { state, sockets } = room
		if (state.phase != 1)
			return rlog(
				roomName,
				`Can't rotate the board after pieces were placed`,
				{ level: "verbose" }
			)
		if (typeof angle != "number" || angle < 0 || angle > 3)
			return rlog(roomName, `${angle} is not a valid angle`, {
				level: "verbose"
			})

		room.state = produce(
			state,
			draft => void (draft.rotation = Math.floor(angle)),
			p => nsp.to(roomName).emit("apply_patches", p)
		)
		rlog(roomName, `Set board rotation to ${angle}`, { level: "verbose" })
	}
}

/**
 * @param {SocketIO.Socket} socket
 * @param {SocketIO.Namespace} nsp
 * @returns {(roomName: string, rank: -1|0|1, i: number) => void}
 */
function placePiece(socket, nsp) {
	return (roomName, rank, i) => {
		const room = rooms.get(roomName)
		if (!room) return log(`Invalid room ${roomName}`, { level: "error" })
		const { state, sockets } = room
		if (
			typeof rank != "number" ||
			Math.abs(rank) > 1 ||
			typeof i != "number" ||
			i < 0 ||
			i > 36
		)
			return rlog(
				roomName,
				`Invalid data supplied to placePiece by ${socket.id}`,
				{ level: "verbose" }
			)
		const player = state.players.indexOf(socket.id)
		if (player == -1)
			return rlog(roomName, `${socket.id} is not a player`, {
				level: "verbose"
			})
		if (
			(player == 0 && state.phase != 2) ||
			(player == 1 && state.phase != 1)
		)
			return rlog(
				roomName,
				`It is not the turn of player ${player} to place pieces`,
				{ level: "verbose" }
			)
		if ((player == 1 && i < 24) || (player == 0 && i > 11))
			return rlog(
				roomName,
				`Player ${player} cannot place a piece at ${i}`,
				{ level: "verbose" }
			)

		const toPlace = state.toPlace[player]
		const replace = state.pieces.find(p => p.position == i)

		if (replace && replace.side != player)
			return rlog(
				roomName,
				`${socket.id} can't replace the opponent's piece`,
				{ level: "verbose" }
			)
		if (!replace && toPlace.unicorn <= 0 && rank == 1)
			return rlog(roomName, `${socket.id} can't place any more queens`, {
				level: "verbose"
			})
		if (!replace && toPlace.paladin <= 0 && rank == 0)
			return rlog(roomName, `${socket.id} can't place any more knights`, {
				level: "verbose"
			})

		room.state = produce(
			state,
			draft => {
				const replace = draft.pieces.find(p => p.position == i)
				if (replace) {
					if (rank == -1) {
						draft.toPlace[player][
							replace.rank ? "unicorn" : "paladin"
						]++
						draft.pieces = draft.pieces.filter(p => p !== replace)
						rlog(
							roomName,
							`Player ${player} picked up a ${
								replace.rank ? "queen" : "knight"
							} at ${i}`,
							{ level: "verbose" }
						)
					} else if (rank != replace.rank) {
						draft.toPlace[player][
							replace.rank ? "unicorn" : "paladin"
						]++
						draft.toPlace[player][rank ? "unicorn" : "paladin"]--
						rlog(
							roomName,
							`Player ${player} replaced a ${
								replace.rank ? "queen" : "knight"
							} at ${i} with a ${rank ? "queen" : "knight"}`,
							{ level: "verbose" }
						)
						replace.rank = rank
					}
				} else if (rank != -1) {
					draft.toPlace[player][rank ? "unicorn" : "paladin"]--
					draft.pieces.push({ position: i, rank, side: player })
					rlog(
						roomName,
						`Player ${player} placed a ${
							rank ? "queen" : "knight"
						} at ${i}`,
						{ level: "verbose" }
					)
				}
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
function donePlacing(socket, nsp) {
	return roomName => {
		const room = rooms.get(roomName)
		if (!room) return log(`Invalid room ${roomName}`, { level: "error" })
		const { state, sockets } = room
		const player = state.players.indexOf(socket.id)
		if (player == -1)
			return rlog(roomName, `${socket.id} is not a player`, {
				level: "verbose"
			})
		if (
			(player == 0 && state.phase != 2) ||
			(player == 1 && state.phase != 1)
		)
			return rlog(
				roomName,
				`It is not the turn of player ${player} finish`,
				{ level: "verbose" }
			)

		const nbQueen = state.pieces.filter(
			p => p.rank == 1 && p.side == player
		).length
		const nbKnight = state.pieces.filter(
			p => p.rank == 0 && p.side == player
		).length

		if (nbQueen != 1 || nbKnight != 5)
			return rlog(
				roomName,
				`Player ${player} hasn't placed all his pieces`,
				{ level: "verbose" }
			)

		room.state = produce(
			state,
			draft => void draft.phase++,
			p => nsp.to(roomName).emit("apply_patches", p)
		)
		rlog(roomName, `Player ${player} is done placing pieces`, {
			level: "verbose"
		})
		if (room.state.phase > 2)
			rlog(roomName, `The game has started!`, {
				level: "verbose"
			})
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
	}
}

/**
 * @param {SocketIO.Socket} socket
 * @returns {Room}
 */
function makeRoom(socket) {
	return {
		state: {
			players: ["", ""],
			pieces: [],
			rotation: 0,
			turn: 0,
			lastPlayed: 0,
			phase: 0,
			selected: -1,
			toPlace: [
				{ paladin: 5, unicorn: 1 },
				{ paladin: 5, unicorn: 1 }
			]
		},
		sockets: [socket]
	}
}

/**
 * @param {number} i
 * @returns {[number,number]}
 */
function i2xy(i) {
	return [i % 6, Math.floor(i / 6)]
}

/**
 * @param {number} x
 * @param {number} y
 */
function xy2i(x, y) {
	return x + y * 6
}

/**
 * @param {[number,number]} a
 * @param {[number,number]} b
 */
function eqPos([x1, y1], [x2, y2]) {
	return x1 == x2 && y1 == y2
}

const boards = [
	JSON.parse(
		"[1,2,2,3,1,2,3,1,3,1,3,2,2,3,1,2,1,3,2,1,3,2,3,1,1,3,1,3,1,2,3,2,2,1,3,2]"
	),
	JSON.parse(
		"[3,1,2,2,3,1,2,3,1,3,1,2,2,1,3,1,3,2,1,3,2,2,1,3,3,1,3,1,3,1,2,2,1,3,2,2]"
	),
	JSON.parse(
		"[2,3,1,2,2,3,2,1,3,1,3,1,1,3,2,3,1,2,3,1,2,1,3,2,2,3,1,3,1,3,2,1,3,2,2,1]"
	),
	JSON.parse(
		"[2,2,3,1,2,2,1,3,1,3,1,3,3,1,2,2,3,1,2,3,1,3,1,2,2,1,3,1,3,2,1,3,2,2,1,3]"
	)
]

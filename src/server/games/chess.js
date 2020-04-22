import io from "socket.io"
import { Deck, suits } from "./deck"
import produce from "immer"

/**
 * @typedef {Object} State
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
		console.log(`${socket.id} joined chess - ${n} connected`)

		socket.on("disconnect", disconnect(socket, nsp))

		socket.on("join", joinRoom(socket))

		socket.on("leave", leaveRoom(socket))

		socket.on("get_initial_state", getInitialState(socket))
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
		console.log(`${socket.id} left chess - ${n} connected`)
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
			sockets.push(socket)
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
				room.sockets = sockets.filter(s => s !== socket)
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
	return {
		state: {},
		sockets: [socket]
	}
}

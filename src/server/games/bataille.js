import io from "socket.io"

/**
 * @param {io.Namespace} nsp
 */
export default function(nsp) {
	nsp.on("connect", socket => {
		const n = Object.keys(nsp.sockets).length
		console.log(`${socket.id} joined bataille - ${n} connected`)
	})
}

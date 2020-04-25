import { IncomingMessage, ServerResponse } from "http"
import send from "@polka/send-type"
import games from "~server/games"

/**
 * @param {IncomingMessage} req
 * @param {ServerResponse} res
 */
export function get(req, res) {
	send(res, 200, {
		error: false,
		data: games.map(g => ({ ...g, handler: undefined }))
	})
}

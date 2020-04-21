import { rules } from "~server/games"
import { IncomingMessage, ServerResponse } from "http"
import send from "@polka/send-type"

/**
 * @param {IncomingMessage} req
 * @param {ServerResponse} res
 */
export function get(req, res) {
	const { game } = req.params
	if (game in rules) send(res, 200, { error: false, data: rules[game] })
	else
		send(res, 404, {
			error: true,
			message: `Rules for game ${game} not found`
		})
}

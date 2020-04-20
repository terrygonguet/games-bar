/**
 * @typedef {"hearts"|"spades"|"diamonds"|"clubs"} Suit
 */

/** @type {Suit[]} */
export const suits = ["clubs", "diamonds", "spades", "hearts"]

export const ranks32 = [1, 7, 8, 9, 10, 11, 12, 13]
export const ranks54 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]

/**
 * @typedef {Object} Card
 * @property {Suit} suit
 * @property {number} rank
 * @property {boolean} hidden
 */

export class Deck {
	/**
	 * @throws {TypeError}
	 */
	constructor() {
		throw new TypeError("Deck has no constructor")
	}

	/**
	 * @param {Object} options
	 * @param {32|54} options.nbCards
	 * @param {boolean=} options.shuffle
	 */
	static create({ nbCards, shuffle = false } = {}) {
		/** @type {Card[]} */
		const cards = []
		for (const suit of suits) {
			for (const rank of nbCards == 54 ? ranks54 : ranks32) {
				cards.push({ suit, rank, hidden: true })
			}
		}
		if (shuffle) cards.sort(() => Math.random() - 0.5)
		return cards
	}

	/**
	 * @param {Card} card
	 */
	static stringifyCard(card) {
		return Deck.stringifyRank(card.rank) + " of " + card.suit
	}

	/**
	 * @param {number} rank
	 */
	static stringifyRank(rank) {
		switch (rank) {
			case 1:
				return "Ace"
			case 11:
				return "Jack"
			case 12:
				return "Queen"
			case 13:
				return "King"
			default:
				return rank.toString()
		}
	}

	/**
	 * @param {Card} a
	 * @param {Card} b
	 * @param {Object} options
	 * @param {boolean=} options.includeHidden
	 */
	static equals(a, b, { includeHidden = false } = {}) {
		return (
			a.rank == b.rank &&
			a.suit == b.suit &&
			(!includeHidden || a.hidden == b.hidden)
		)
	}

	/**
	 * @param {Card[]} deck
	 * @param {boolean=} reveal
	 */
	static drawOne(deck, reveal = true) {
		const card = deck.pop()
		if (reveal) card.hidden = false
		return card
	}

	/**
	 * @param {Card[]} deck
	 * @param {number} n
	 * @param {boolean=} reveal
	 */
	static draw(deck, n, reveal = true) {
		n = Math.floor(Math.abs(n))
		const cards = deck.splice(-n, n)
		if (reveal) cards.forEach(c => (c.hidden = false))
		return cards
	}

	/**
	 * @param {Card[]} deck
	 * @param {Card|Card[]} oneOrMoreCards
	 * @param {"top"|"bottom"|"random"} where
	 */
	static putBack(deck, oneOrMoreCards, where = "bottom") {
		const cards = Array.isArray(oneOrMoreCards)
			? oneOrMoreCards
			: [oneOrMoreCards]
		cards.forEach(c => (c.hidden = true))

		switch (where) {
			case "top":
				deck.push(...cards.reverse())
				break
			case "bottom":
				deck.unshift(...cards)
				break
			case "random":
				for (const card of cards) {
					deck.splice(
						Math.floor(Math.random() * deck.length),
						0,
						card
					)
				}
				break
		}

		return deck
	}
}

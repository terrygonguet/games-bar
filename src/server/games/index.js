import solitaire from "./solitaire"
import chess from "./chess"
import petitbac from "./petitbac"
import escampe from "./escampe"

export default [
	{ name: "Solitaire", path: "solitaire", handler: solitaire },
	{ name: "Chess", path: "chess", handler: chess },
	{ name: "Petit Bac", path: "petitbac", handler: petitbac },
	{ name: "Escampe", path: "escampe", handler: escampe }
]

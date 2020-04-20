import * as sapper from "@sapper/app"
import { enablePatches } from "immer"

enablePatches()
sapper.start({
	target: document.querySelector("#sapper")
})

<script>
	import { createEventDispatcher } from "svelte"
	import { flip } from "~tools"

	export let rotation = 0
	export let scale = 100
	export let mirror = false
	export let placementMode = false
	export let pieces = []
	export let lastPlayed = -1

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
	const emit = createEventDispatcher()

	$: board = boards[(rotation + (mirror ? 2 : 0)) % 4]
	$: piecesIndexes = pieces.map(p => mirror ? flip(p.position) : p.position)
	$: isLit = board.map(isPlayable, piecesIndexes)

	function isPlayable(c, i) {
		if (placementMode) return i >= 24
		if (piecesIndexes.includes(i)) return lastPlayed == 0 || lastPlayed == c
	}

	function onClick(i) {
		return function () {
			emit("click", mirror ? flip(i) : i)
		}
	}
</script>

<style>
#board {
	display: grid;
	grid-template-columns: repeat(6, 140px);
	grid-template-rows: repeat(6, 140px);
}

.cell {
	border-color: wheat;
}

.circle {
	border-color: inherit;
}

.highlight {
	border-color: orange;
}
</style>

<div class="flex-center" style="width:{scale * 8.84}px;height:{scale * 8.84}px;">
	<div
		id="board"
		class="p-4 bg-red-900 border-6 border-black relative rounded transform"
		style="--transform-scale-x:{scale}%;--transform-scale-y:{scale}%;"
	>
		{#each board as cell, i}
			<div class="p-1 cell" on:click={onClick(i)} class:highlight={isLit[i]}>
				<div class="p-1 border-3 rounded-full h-full circle">
					{#if cell >= 2}
						<div class="p-1 border-3 rounded-full h-full circle">
							{#if cell == 3}
								<div class="p-1 border-3 rounded-full h-full circle"></div>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		{/each}
		<slot></slot>
	</div>
</div>
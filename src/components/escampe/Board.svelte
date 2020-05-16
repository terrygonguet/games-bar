<script context="module">
	export const boards = [
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
</script>

<script>
	import { createEventDispatcher } from "svelte"
	import { flip } from "~tools"

	export let rotation = 0
	export let scale = 100
	export let mirror = false
	export let placementMode = false
	export let pieces = []
	export let lastPlayed = -1
	export let selected = -1
	export let glow = false

	const emit = createEventDispatcher()

	$: board = boards[(rotation + (mirror ? 2 : 0)) % 4]
	$: piecesIndexes = pieces.map(p => mirror ? flip(p.position) : p.position)
	$: isLit = board.map(isPlayable, piecesIndexes, placementMode) // explicit dependencies
	$: realSelected = mirror ? flip(selected) : selected

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

#glow {
	box-shadow: 0 0 30px 7px rebeccapurple;
	animation: glow 2s ease-out infinite alternate;
	top: 1px;
	left: 1px;
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

.selected {
	box-shadow: 0px 0px 10px 3px blue;
}

@keyframes glow {
	from {
		opacity: 0.3;
	}
	to {
		opacity: 1;
	}
}
</style>

<div class="flex-center relative" style="width:{scale * 8.84}px;height:{scale * 8.84}px;">
	{#if glow}
		<div class="absolute w-full h-full" id="glow" />
	{/if}
	<div
		id="board"
		class="p-4 bg-red-900 border-6 border-black relative rounded transform"
		style="--transform-scale-x:{scale / 100};--transform-scale-y:{scale / 100};"
	>
		{#each board as cell, i}
			<div
				class="m-1 cell rounded-full"
				on:click={onClick(i)}
				class:highlight={isLit[i]}
				class:selected={realSelected == i}
			>
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
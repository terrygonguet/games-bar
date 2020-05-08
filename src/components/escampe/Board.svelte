<script>
	import { createEventDispatcher } from "svelte"

	export let rotation = 0
	export let scale = 100
	export let mirror = false

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

	function onClick(i) {
		return function () {
			if (mirror) {
				let x = i % 6, y = Math.floor(i / 6)
				emit("click", (5 - y) * 6 + (5 - x))
			} else emit("click", i)
		}
	}
</script>

<style>
#board {
	display: grid;
	grid-template-columns: repeat(6, 140px);
	grid-template-rows: repeat(6, 140px);
}
</style>

<div class="flex-center" style="width:{scale * 8.84}px;height:{scale * 8.84}px;">
	<div
		id="board"
		class="p-4 bg-red-900 border-6 border-black relative rounded transform"
		style="--transform-scale-x:{scale}%;--transform-scale-y:{scale}%;"
	>
		{#each board as cell, i}
			<div class="p-1" on:click={onClick(i)}>
				<div class="p-1 border-3 border-white rounded-full h-full">
					{#if cell >= 2}
						<div class="p-1 border-3 border-white rounded-full h-full">
							{#if cell == 3}
								<div class="p-1 border-3 border-white rounded-full h-full"></div>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		{/each}
		<slot></slot>
	</div>
</div>
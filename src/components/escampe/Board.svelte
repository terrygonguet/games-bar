<script>
	import { createEventDispatcher } from "svelte"

	export let rotation = 0

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

	$: board = boards[rotation]
</script>

<style>
#board {
	display: grid;
	grid-template-columns: repeat(6, 140px);
	grid-template-rows: repeat(6, 140px);
}
</style>

<div id="board" class="p-4 bg-red-900 border-6 border-black relative rounded">
	{#each board as cell, i}
		<div class="p-1" on:click={() => emit("click", i)}>
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
<script>
	import { createEventDispatcher } from "svelte"

	export let unicorn = 1
	export let paladin = 5
	export let selected = -1
	export let player
	export let selectedRank = -1
	export let scale = 100

	const emit = createEventDispatcher()

	$: isBlack = !!player
	$: selectedRank = selected == -1 ? -1 : (selected >= paladin ? 1 : 0)
	$: done = unicorn + paladin == 0
	$: style =
		`--transform-translate-y: -${scale / 200}%;
		--transform-scale-x: ${scale / 100};
		--transform-scale-y: ${scale / 100};`

	function classPiece(rank) {
		if (rank) return isBlack ? "unicorn-black" : "unicorn-white"
		else return isBlack ? "paladin-black" : "paladin-white"
	}
</script>

<style>
.selected {
	filter: saturate(2);
}
</style>


{#if done}
	<button class="btn btn-warning m-8" on:click={() => emit("done")}>Done!</button>
{:else}
	<ol
		class="flex justify-center transform"
		{style}
	>
		{#each Array(paladin) as _, i}
			<li
				class="m-4 escampe cursor-pointer {classPiece(0)}"
				class:selected={selected == i}
				on:click={() => (selected = i)}
			></li>
		{/each}
		{#each Array(unicorn) as _, i}
			<li
				class="m-4 escampe cursor-pointer {classPiece(1)}"
				class:selected={selected == paladin + i}
				on:click={() => (selected = paladin + i)}
			></li>
		{/each}
	</ol>
{/if}
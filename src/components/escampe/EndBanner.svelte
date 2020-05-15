<script>
	import { createEventDispatcher } from "svelte"
	import { fade } from "svelte/transition"

	export let youWin = true
	export let rematch = [false, false]
	export let side = 0
	export let isPlayer = true

	const emit = createEventDispatcher()

	$: opponentWantsRematch = rematch[side ? 0 : 1]
</script>

<style>
div {
	top: 35%;
}
</style>

<div
	transition:fade={{ duration: 500 }}
	class="w-full bg-yellow-500 text-black absolute left-0 p-8 text-center flex-center transform -translate-y-1/2"
>
	{#if isPlayer}
		<h2 class="text-4xl font-bold">You {youWin ? "won!" : "lost..."}</h2>
		{#if rematch[side]}
			<p class="text-xl m-4">Waiting for your opponent to confirm</p>
		{:else}
			<p class="text-xl m-4">
				{opponentWantsRematch
					? "Your opponent wants a rematch!"
					: "Do you want to play again?"}
			</p>
			<button class="btn btn-warning text-xl" on:click={() => emit("rematch")}>Yes!</button>
		{/if}
	{:else}
		<h2 class="text-4xl font-bold">The {side ? "black" : "white"} player won!</h2>
	{/if}
</div>
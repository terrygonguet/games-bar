<script>
	import { getSocket } from "~tools"

	export let state
	export let room

	const socket = getSocket("chess")

	$: isWhite = $state.player1 == socket.id
	$: isBlack = $state.player2 == socket.id
	$: hasChosen = isWhite || isBlack

	function choose(i) {
		return () => socket.emit("choose_side", room, i)
	}
</script>

<form onsubmit="return false" class="text-3xl bg-white text-black mt-24 w-full">
	{#if !hasChosen}
		<h2 class="text-center font-semibold text-5xl m-8">Choose your side</h2>
		<div class="flex justify-center items-center flex-1 m-8">
			<button
				class="btn m-4"
				on:click={choose(1)}
				disabled={$state.player1}>
				White
			</button>
			<button
				class="btn m-4"
				on:click={choose(2)}
				disabled={$state.player2}>
				Black
			</button>
		</div>
	{:else}
		<h2 class="text-center font-semibold text-5xl m-8">
			You are {isWhite ? 'white' : 'balck'}
		</h2>
	{/if}
</form>
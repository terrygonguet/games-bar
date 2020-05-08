<script>
	import { stateProp } from "~stores"
	import { getSocket } from "~tools"
	import { onMount } from "svelte";

	export let state
	export let room

	const socket = getSocket("escampe")
	const players = stateProp(state, "players")

	$: side = $players.indexOf(socket.id)
	$: hasChosen = side != -1
	$: unicorn = side ? "unicorn-black": "unicorn-white"
	$: paladin = side ? "paladin-black": "paladin-white"

	function choose(i) {
		return function () {
			socket.emit("choose_side", room, i)
		}
	}

	onMount(() => {
		if (process.dev) {
			socket.emit("choose_side", room, 1)
			socket.emit("choose_side", room, 0)
		}
	})
</script>

<style>
button:disabled {
	filter: grayscale(1);
	cursor: not-allowed;
}
</style>

<section class="bg-blue-500 mt-24 p-4 text-white w-full flex flex-col justify-center">
	{#if !hasChosen}
		<h2 class="text-4xl text-center">Choose a side</h2>
		<ol class="flex justify-center">
			<li class="m-4">
				<button
					class="p-2 border rounded bg-blue-300 hover:bg-blue-200"
					disabled={!!$players[0]}
					on:click={choose(0)}
				>
					<div class="escampe unicorn-white" />
				</button>
			</li>
			<li class="m-4">
				<button
					class="p-2 border rounded bg-blue-300 hover:bg-blue-200"
					disabled={!!$players[1]}
					on:click={choose(1)}
				>
					<div class="escampe unicorn-black" />
				</button>
			</li>
		</ol>
	{:else}
		<h2 class="text-4xl text-center">Waiting for an opponent to join</h2>
		<ol class="flex justify-center">
			<li class="m-4 escampe {paladin}"></li>
			<li class="m-4 escampe {paladin}"></li>
			<li class="m-4 escampe {paladin}"></li>
			<li class="m-4 escampe {paladin}"></li>
			<li class="m-4 escampe {paladin}"></li>
			<li class="m-4 escampe {unicorn}"></li>
		</ol>
	{/if}
</section>
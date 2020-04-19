<script context="module">
	export function preload({ path, params, query }) {
		return { game: params.game }
	}
</script>

<script>
	import { fade } from "svelte/transition"
	import { capitalize, getSocket } from "../../../tools"
	import { goto } from '@sapper/app'

	export let game

	const socket = getSocket(game)
	let room = ""

	$: capitalized = capitalize(game)

	function go() {
		if (!room) return
		goto(`game/${game}/${room}`)
	}
</script>

<svelte:head>
	<title>Games Bar - {capitalized}</title>
</svelte:head>

<main
	class="flex-center"
	in:fade={{ duration: 200, delay: 200 }}
	out:fade={{ duration: 200 }}>
	<h1 class="text-4xl font-semibold mb-4">{capitalized}</h1>
	<form onsubmit="return false">
		<label>
			Room name:
			<input type="text" name="room" bind:value={room} class="inpt m-2" />
		</label>
		<button disabled={!room} class="btn" on:click={go}>GO</button>
	</form>
</main>

<script context="module">
	export function preload({ path, params, query }) {
		return { game: params.game, room: params.room }
	}
</script>

<script>
	import { fade } from "svelte/transition"
	import { capitalize, getSocket } from "../../../tools"
	import { onMount } from "svelte";

	export let game
	export let room

	const socket = getSocket(game)

	$: capitalized = capitalize(game)

	onMount(() => {
		socket.emit("join", room)
	})
</script>

<svelte:head>
	<title>Games Bar - {capitalized} - {room}</title>
</svelte:head>

<main
	class="flex-center"
	in:fade={{ duration: 200, delay: 200 }}
	out:fade={{ duration: 200 }}>
	<h1 class="text-4xl font-semibold mb-4">{capitalized} - {room}</h1>
</main>

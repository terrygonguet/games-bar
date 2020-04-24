<script context="module">
	export function preload({ path, params, query }) {
		const room = params.room
		return { room }
	}
</script>

<script>
	import { fade } from "svelte/transition"
	import { getSocket } from "~tools"
	import { onMount } from "svelte"
	import { writable } from "svelte/store"
	import { makeStateFromSocket } from "~stores"
	import ChessChooseSide from "~components/ChessChooseSide"
	import ChessBoard from "~components/ChessBoard"

	export let room

	const socket = getSocket("chess")
	let state = writable(null) // temp value

	onMount(() => {
		socket.emit("join", room)
		state = makeStateFromSocket(socket, room)
		return () => socket.emit("leave", room)
	})
</script>

<svelte:head>
	<title>Games Bar - Chess - {room}</title>
</svelte:head>

<main
	class="flex items-center flex-col overflow-x-hidden bg-green-800 text-white"
	in:fade={{ duration: 200, delay: 200 }}
	out:fade={{ duration: 200 }}>
	<h1 class="text-4xl font-semibold text-center my-8">Chess - {room}</h1>
	{#if $state}
		{#if $state.state == "choosing"}
			<ChessChooseSide {state} {room} />
		{:else}
			<ChessBoard {state} {room} />
		{/if}
	{:else}
		<p class="flex-1 flex-center text-4xl">Loading...</p>
	{/if}
</main>

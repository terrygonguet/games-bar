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

	export let room

	const socket = getSocket("escampe")
	let state = writable(null) // temp value

	onMount(() => {
		socket.emit("join", room)
		state = makeStateFromSocket(socket, room)
		return () => socket.emit("leave", room)
	})
</script>

<svelte:head>
	<title>Games Bar - Escampe - {room}</title>
</svelte:head>

<main
	class="flex items-center flex-col"
	in:fade={{ duration: 200, delay: 200 }}
	out:fade={{ duration: 200 }}>
	<h1 class="text-4xl font-semibold text-center mb-8">Escampe - {room}</h1>
	{#if $state}
		<pre>{JSON.stringify($state, null, 2)}</pre>
	{:else}
		<p>Loading...</p>
	{/if}
</main>

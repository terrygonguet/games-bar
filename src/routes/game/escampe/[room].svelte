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
	import { makeStateFromSocket, stateProp } from "~stores"
	import ChooseSide from "~components/escampe/ChooseSide"
	import PlacePieces from "~components/escampe/PlacePieces"
	import Playing from "~components/escampe/Playing"

	export let room

	const socket = getSocket("escampe")
	const components = [
		ChooseSide,
		PlacePieces,
		PlacePieces,
		Playing,
	]
	let state = writable(null) // temp value
	let phase

	$: process.dev && console.log($state)

	onMount(() => {
		socket.emit("join", room)
		state = makeStateFromSocket(socket, room)
		phase = stateProp(state, "phase")
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
		<svelte:component this={components[$phase]} {room} {state} />
	{:else}
		<p>Loading...</p>
	{/if}
</main>

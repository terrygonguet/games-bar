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

	let name

	const socket = getSocket("petitbac")
	let state = writable(null) // temp value

	function keyup(e) {
		if (e.key == "Enter") socket.emit("choose_name", room, name)
	}

	onMount(() => {
		socket.emit("join", room)
		state = makeStateFromSocket(socket, room)
		return () => socket.emit("leave", room)
	})
</script>

<style>
</style>

<svelte:head>
	<title>Games Bar - Petit Bac - {room}</title>
</svelte:head>

<main
	class="overflow-x-hidden flex flex-col items-center"
	in:fade={{ duration: 200, delay: 200 }}
	out:fade={{ duration: 200 }}>
	<h1 class="text-4xl font-semibold text-center my-8">Petit Bac - {room}</h1>
	{#if $state}
		<input type="text" class="inpt" bind:value={name} on:keyup={keyup}>
		<pre>{JSON.stringify($state,null,2)}</pre>
	{:else}
		<p>Loading...</p>
	{/if}
</main>

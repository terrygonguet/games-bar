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
	import PetitBac from "~components/PetitBac";

	export let room

	let name

	const socket = getSocket("petitbac")
	let state = writable(null) // temp value

	$: hasName = $state && socket.id in $state.players

	function keyup(e) {
		if (e.key == "Enter") chooseName()
	}

	function chooseName () {
		socket.emit("choose_name", room, name)
	}

	onMount(() => {
		socket.emit("join", room)
		state = makeStateFromSocket(socket, room)
		if (process.dev) {
			name = Math.random().toString(36).slice(2)
			chooseName()
		}
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
	<h1 class="text-4xl font-semibold text-center my-4 md:my-8">Petit Bac - {room}</h1>
	{#if $state}
		{#if hasName}
			<PetitBac {state} {room} />
		{:else}
			<label>
				Choisis un nom
				<input type="text" class="inpt" placeholder="Gertrude" bind:value={name} on:keyup={keyup}>
				<button class="btn" on:click={chooseName}>GO</button>
			</label>
		{/if}
	{:else}
		<p>Loading...</p>
	{/if}
</main>

<script context="module">
	export async function preload({ path, params, query }) {
		const game = params.game
		const res = await this.fetch(`game/${game}/rules`)
		const { error, message, data } = await res.json()

		if (error) this.error(res.status, message)
		else return { game, rules: data }
	}
</script>

<script>
	import { fade } from "svelte/transition"
	import { capitalize, getSocket } from "~tools"
	import { goto } from '@sapper/app'

	export let game
	export let rules = []

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
	class="flex flex-col items-center pt-24"
	in:fade={{ duration: 200, delay: 200 }}
	out:fade={{ duration: 200 }}>
	<h1 class="text-4xl font-semibold mb-4">{capitalized}</h1>
	<form onsubmit="return false">
		<label>
			Create or join room:
			<input
				type="text"
				name="room"
				bind:value={room}
				class="inpt m-2"
				placeholder="Room name"/>
		</label>
		<button disabled={!room} class="btn" on:click={go}>GO</button>
	</form>
	<h2 class="text-2xl font-semibold my-4">Rules</h2>
	{#each rules as line}
		<p class="max-w-1k my-4">{line}</p>
	{:else}
		<p class="text-center">Loading...</p>
	{/each}
</main>

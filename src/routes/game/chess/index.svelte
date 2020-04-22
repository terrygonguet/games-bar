<script>
	import { fade } from "svelte/transition"
	import { goto } from '@sapper/app'

	let room = ""

	function go() {
		if (!room) return
		goto(`game/chess/${room}`)
	}
</script>

<svelte:head>
	<title>Games Bar - Chess</title>
</svelte:head>

<main
	class="flex flex-col items-center pt-24"
	in:fade={{ duration: 200, delay: 200 }}
	out:fade={{ duration: 200 }}>
	<h1 class="text-4xl font-semibold mb-4">Chess</h1>
	<h2 class="text-2xl font-semibold my-4">Rules</h2>
	<section class="max-w-1k text-justify">
		<p class="my-4">
			It's <a href="https://en.wikipedia.org/wiki/Chess" target="_blank">chess</a>. You know what chess is.
		</p>
	</section>
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
</main>

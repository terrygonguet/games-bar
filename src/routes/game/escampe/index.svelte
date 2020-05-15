<script>
	import { fade } from "svelte/transition"
	import { goto } from '@sapper/app'

	let room = ""

	function go() {
		if (!room) return
		goto(`game/escampe/${room}`)
	}
</script>

<svelte:head>
	<title>Games Bar - Escampe</title>
</svelte:head>

<main
	class="flex flex-col items-center py-12 px-2"
	in:fade={{ duration: 200, delay: 200 }}
	out:fade={{ duration: 200 }}>
	<h1 class="text-4xl font-semibold mb-4">Escampe</h1>
	<h2 class="text-2xl font-semibold my-4">Rules</h2>
	<section class="max-w-1k text-justify">
		<p class="my-4">
			Aliquip reprehenderit est eu aute quis commodo in consectetur exercitation magna velit esse. Quis fugiat reprehenderit laborum ullamco esse aute amet nisi. Esse voluptate sint commodo sint adipisicing nisi sint cillum in magna ea irure pariatur.
		</p>
		<p class="my-4">
			Dolor adipisicing officia mollit elit. Amet est incididunt cillum incididunt nostrud ut nostrud. Sunt ullamco exercitation esse sint mollit ullamco. Fugiat ex id ullamco amet voluptate aute cillum Lorem adipisicing nisi nostrud aliquip.
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

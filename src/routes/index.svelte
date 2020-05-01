<script context="module">
	import { easyFetch } from "~tools"

	export async function preload() {
		const games = await easyFetch(this, "availablegames")
		return { games }
	}
</script>

<script>
	import { fade } from "svelte/transition"

	export let games = []
</script>

<svelte:head>
	<title>Games Bar - Home</title>
</svelte:head>

<main
	class="flex flex-col items-center py-12"
	in:fade={{ duration: 200, delay: 200 }}
	out:fade={{ duration: 200 }}>
	<h1 class="text-4xl font-semibold mb-4">Available games:</h1>
	<ul class="flex">
		{#each games as { name, path }}
			<li>
				<a href="game/{path}">
					<button class="btn m-4">{name}</button>
				</a>
			</li>
		{:else}
			<li>Loading...</li>
		{/each}
	</ul>
</main>

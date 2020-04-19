<script>
	import { fade } from "svelte/transition";
	import { availableGames } from "../stores"
</script>

<svelte:head>
	<title>Games Bar - Home</title>
</svelte:head>

<main
	class="flex-center"
	in:fade={{ duration: 200, delay: 200 }}
	out:fade={{ duration: 200 }}>
	<h1 class="text-4xl font-semibold mb-4">Available games:</h1>
	<ul>
		{#each $availableGames as game}
			<li>
				<a href="game/{game}">
					<button class="btn">{game}</button>
				</a>
			</li>
		{:else}
			<li>Loading...</li>
		{/each}
	</ul>
</main>

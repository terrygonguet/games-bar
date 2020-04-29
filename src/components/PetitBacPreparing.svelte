<script>
	export let state
</script>

<section class="flex flex-col items-center">
	<h2 class="text-2xl font-semibold text-center m-4">Catégories</h2>
	<h4 class="text-base text-gray-700 m-2 text-center">(Seul le 👑 peut modifier les catégories)</h4>
	<ol class="list-decimal pl-8 m-2">
		{#each $state.categories as category}
			<li>{category}</li>
		{:else}
			<li>Aucune</li>
		{/each}
	</ol>
</section>
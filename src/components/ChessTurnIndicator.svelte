<script>
	export let isWhite
	export let turn

	$: yourTurn = (turn + (isWhite ? 0 : 1)) % 2
</script>

<h2 class="text-2xl font-semibold">
	You are {isWhite ? "white" : "black"} -
	Turn {turn}
</h2>
{#if yourTurn}
	<h3 class="text-xl">It is your turn</h3>
{/if}

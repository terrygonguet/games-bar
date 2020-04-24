<script>
	export let isPlayer
	export let isWhite
	export let turn

	$: yourTurn = isPlayer && (turn + (isWhite ? 0 : 1)) % 2
</script>

<h2 class="text-2xl font-semibold">
	{#if isPlayer}
		You are {isWhite ? "white" : "black"} -
	{/if}
	Turn {turn}
</h2>
{#if yourTurn && turn < 15}
	<h3 class="text-xl">It is your turn</h3>
{/if}

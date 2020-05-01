<script>
	export let state
	export let socketId

	$: isPlayer = $state.player1 == socketId || $state.player2 == socketId
	$: isWhite = !isPlayer || $state.player1 == socketId
	$: yourTurn = isPlayer && ($state.turn + (isWhite ? 0 : 1)) % 2
</script>

<h2 class="text-2xl font-semibold">
	{#if isPlayer}
		You are {isWhite ? "white" : "black"} -
	{/if}
	Turn {$state.turn}
</h2>
<div class="flex text-xl">
	{#if yourTurn && $state.turn < 15}
		<h3 class="mx-2">It is your turn</h3>
	{/if}
	{#if $state.check}
		<h3
			class="font-semibold mx-2"
			class:text-red-500={yourTurn}
			class:text-blue-500={!yourTurn}
		>
			CHECK
		</h3>
	{/if}
</div>

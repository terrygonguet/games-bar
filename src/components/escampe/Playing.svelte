<script>
	import { stateProp } from "~stores"
	import { getSocket } from "~tools"
	import Board from "~components/escampe/Board"
	import Piece from "~components/escampe/Piece"

	export let state
	export let room

	const socket = getSocket("escampe")
	const rotation = stateProp(state, "rotation")
	const players = stateProp(state, "players")
	const pieces = stateProp(state, "pieces")
	const turn = stateProp(state, "turn")
	const lastPlayed = stateProp(state, "lastPlayed")

	$: side = $players.indexOf(socket.id)
	$: isPlayer = side != -1
	$: isYourTurn = isPlayer && side == $turn
	$: isWhite = isPlayer && side == 0
	$: isBlack = isPlayer && side == 1
	$: playablePieces = $pieces.filter(p => p.side == $turn)

	function onClick({ detail: i }) {
		console.log(i)
	}
</script>


<section class="flex flex-col justify-center">
	<Board
		rotation={$rotation}
		on:click={onClick}
		scale={75} mirror={isWhite}
		pieces={playablePieces}
		lastPlayed={$lastPlayed}
	>
		{#each $pieces as piece (piece)}
			<Piece {...piece} mirror={isWhite} />
		{/each}
	</Board>
	{#if isYourTurn}
		<h2 class="text-4xl text-center">It is your turn</h2>
	{/if}
</section>
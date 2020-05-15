<script>
	import { stateProp } from "~stores"
	import { getSocket } from "~tools"
	import Board, { boards } from "~components/escampe/Board"
	import Piece from "~components/escampe/Piece"
	import EndBanner from "~components/escampe/EndBanner"

	export let state
	export let room

	const socket = getSocket("escampe")
	const rotation = stateProp(state, "rotation")
	const players = stateProp(state, "players")
	const pieces = stateProp(state, "pieces")
	const turn = stateProp(state, "turn")
	const lastPlayed = stateProp(state, "lastPlayed")
	const rematch = stateProp(state, "rematch")
	const phase = stateProp(state, "phase")
	let selected = -1

	$: gameEnd = $phase == 4
	$: side = $players.indexOf(socket.id)
	$: isPlayer = side != -1
	$: isYourTurn = !gameEnd && isPlayer && side == $turn
	$: isWhite = isPlayer && side == 0
	$: isBlack = isPlayer && side == 1
	$: board = boards[($rotation + (isWhite ? 2 : 0)) % 4]
	$: playablePieces = gameEnd ? [] : $pieces.filter(p => p.side == $turn)
	$: lastQueen = gameEnd ? $pieces.find(p => p.rank == 1) : []
	$: youWin = gameEnd && $players[lastQueen.side] == socket.id

	function onClick({ detail: i }) {
		if (!isYourTurn) return
		if (selected == -1) selected = i
		else {
			socket.emit("move", room, selected, i)
			selected = -1
		}
	}

	function wantRematch() {
		socket.emit("want_rematch", room)
	}
</script>


<section class="flex flex-col justify-center">
	<Board
		rotation={$rotation}
		on:click={onClick}
		scale={75} mirror={isWhite}
		pieces={playablePieces}
		lastPlayed={$lastPlayed}
		{selected}
		glow={isYourTurn}
	>
		{#each $pieces as piece, i (piece.id)}
			<Piece {...piece} mirror={isWhite} />
		{/each}
	</Board>
	{#if !gameEnd && isPlayer}
		<h2 class="text-2xl text-center" class:text-4xl={isYourTurn}>
			It is your {isYourTurn ? "" : "opponent's"} turn
		</h2>
	{/if}
	{#if gameEnd}
		<EndBanner {youWin} rematch={$rematch} {side} {isPlayer} on:rematch={wantRematch} />
	{/if}
</section>
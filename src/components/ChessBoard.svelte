<script>
	import { getSocket } from "~tools"
	import produce from "immer"
	import ChessTurnIndicator from "~components/ChessTurnIndicator";

	export let state
	export let room

	const pieces = [
		"nothing",
		"white-pawn", "white-rook", "white-knight", "white-bishop", "white-queen", "white-king",
		"black-pawn", "black-rook", "black-knight", "black-bishop", "black-queen", "black-king"
	]
	const socket = getSocket("chess")
	let scale = 1, showLastMove = true

	if (process.browser) {
		if (innerHeight < 1000) scale = innerHeight / 1100
	}

	$: isPlayer = $state.player1 == socket.id || $state.player2 == socket.id
	$: isWhite = !isPlayer || $state.player1 == socket.id
	$: flipedBoard = isWhite ? $state.board : flipBoard($state.board)
	$: yourTurn = isPlayer && ($state.turn + (isWhite ? 0 : 1)) % 2
	$: isLastMove = i => {
		const j = realPosition(i)
		return j == $state.lastMove.from || j == $state.lastMove.to
	}

	function cellColor(i) {
		const j = isWhite ? 0 : 1
		if (Math.floor(i / 8) % 2) return (i + j) % 2
		else return (i + j + 1) % 2
	}

	function flipBoard(board) {
		return produce(board, draft => {
			const rows = Array(8).fill().map((_, i) => draft.slice(i * 8, i * 8 + 8))
			rows.reverse()
			return rows.flat()
		})
	}

	function onClick(i) {
		return () => {
			if (!yourTurn) return
			if ($state.selected == -1) socket.emit("select", room, realPosition(i))
			else if (realPosition(i) == $state.selected) socket.emit("select", room, -1)
			else socket.emit("move", room, $state.selected, realPosition(i))
		}
	}

	function isSelected(i) {
		return $state.selected == realPosition(i)
	}

	function realPosition(i) {
		return isWhite ? i : flipPosition(i)
	}

	function flipPosition(i) {
		return -(Math.floor(i / 8) - 7) * 8 + (i % 8)
	}

	function isLastFrom(i) {
		return 
	}

	function isLastTo(i) {
		return realPosition(i) == $state.lastMove.to
	}
</script>

<style>
#board {
	display: grid;
	grid-template-columns: repeat(8, auto);
	grid-template-rows: repeat(8, auto);
}

.caught {
	display: grid;
	grid-auto-rows: max-content;
	grid-template-columns: repeat(3, calc(var(--chess-scale) * var(--chess-piece)));
}

.your-turn {
	box-shadow: 0px 0px 10px 0px goldenrod;
	position: relative;
}

.your-turn::after {
	box-shadow: 0px 0px 20px 5px goldenrod;
	opacity: 0;
	animation: glow 1s ease-out infinite alternate;
	position: absolute;
	content: "";
	width: calc(100% + 8px);
	height: calc(100% + 8px);
	top: -4px;
	left: -4px;
	pointer-events: none;
}

.bg-lastmove {
	background-color: gold !important;
}

@keyframes glow {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}
</style>

<section class="m-4 flex" style="--chess-scale:{scale}">
	<label class="absolute top-0 right-0 m-4">
		Show last move
		<input type="checkbox" bind:checked={showLastMove} />
	</label>
	<div class="caught p-4" style="--chess-scale:{scale / 2}">
		<p class="col-span-3 border-b border-white text-center">Pieces captured</p>
		{#each isWhite ? $state.p1caught : $state.p2caught as piece}
			<div class="piece {pieces[piece]}" />
		{:else}
			<div class="w-piece h-piece" />
		{/each}
	</div>
	<div
		id="board"
		class="border-4 border-black"
		class:your-turn={yourTurn}
		class:border-red-600={$state.check && yourTurn}
		class:border-blue-600={$state.check && !yourTurn}
	>
		{#each flipedBoard as cell, i (i)}
			<div
				class="w-piece h-piece {cellColor(i) ? "bg-yellow-900" : "bg-orange-400"}"
				class:bg-lastmove={showLastMove && yourTurn && isLastMove(i)}
				on:click={onClick(i)}
			>
				{#if cell !== null}
					<div
						class="piece {pieces[cell]} cursor-pointer"
						class:bg-purple-500={isSelected(i)}
					/>
				{/if}
			</div>
		{/each}
	</div>
	<div class="caught p-4" style="--chess-scale:{scale / 2}">
		<p class="col-span-3 border-b border-white text-center">Pices lost</p>
		{#each isWhite ? $state.p2caught : $state.p1caught as piece}
			<div class="piece {pieces[piece]}" />
		{:else}
			<div class="w-piece h-piece" />
		{/each}
	</div>
</section>
<ChessTurnIndicator {state} socketId={socket.id} />

<script>
	import { getSocket } from "~tools"
	import produce from "immer"
	import ChessTurnIndicator from "~components/ChessTurnIndicator";

	export let state
	export let room

	const pieces = [
		"white-pawn", "white-rook", "white-knight", "white-bishop", "white-queen", "white-king",
		"black-pawn", "black-rook", "black-knight", "black-bishop", "black-queen", "black-king"
	]
	const socket = getSocket("chess")

	$: isWhite = $state.player1 == socket.id
	$: rotatedBoard = isWhite ? $state.board : rotate($state.board)
	$: yourTurn = ($state.turn + (isWhite ? 0 : 1)) % 2

	function cellColor(i) {
		if (Math.floor(i / 8) % 2) return i % 2 ? "bg-orange-400" : "bg-yellow-900"
		else return i % 2 ? "bg-yellow-900" : "bg-orange-400"
	}

	function rotate(board) {
		return produce(board, draft => {
			const rows = Array(8).fill().map((_, i) => draft.slice(i * 8, i * 8 + 8))
			rows.reverse()
			return rows.flat()
		})
	}

	function onClick(i) {
		return () => {
			if (!yourTurn) return
			if ($state.selected == -1) socket.emit("select", room, i)
			else if (i == $state.selected) socket.emit("select", room, -1)
			else socket.emit("move", room, $state.selected, i)
		}
	}

	function isSelected(i) {
		if (isWhite) return $state.selected == i
		else {
			const y = Math.floor(i / 8)
			return $state.selected == Math.abs(y - 7) * 8 + (i % 8)
		}
	}
</script>

<style>
#board {
	display: grid;
	grid-template-columns: repeat(8, auto);
	grid-template-rows: repeat(8, auto);
}
</style>

<section class="m-4 flex">
	<div id="board">
		{#each rotatedBoard as cell, i}
			<div
				class="w-piece h-piece {cellColor(i)}"
				on:click={onClick(i)}>
				{#if cell !== null}
					<div
						class="piece {pieces[cell]} cursor-pointer"
						class:bg-purple-500={isSelected(i)}/>
				{/if}
			</div>
		{/each}
	</div>
</section>
<ChessTurnIndicator {isWhite} turn={$state.turn} />

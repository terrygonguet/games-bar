<script>
	import { stateProp } from "~stores"
	import { getSocket } from "~tools"
	import Board from "~components/escampe/Board"
	import Piece from "~components/escampe/Piece"

	export let state
	export let room

	const socket = getSocket("escampe")
	const players = stateProp(state, "players")
	const phase = stateProp(state, "phase")
	const rotation = stateProp(state, "rotation")
	const toPlaceArr = stateProp(state, "toPlace")
	const pieces = stateProp(state, "pieces")
	let selected = -1

	$: side = $players.indexOf(socket.id)
	$: isPlayer = side != -1
	$: isWhite = isPlayer && side == 0
	$: isBlack = isPlayer && side == 1
	$: canRotate = $phase == 1 && isBlack
	$: canPlace = canRotate || ($phase == 2 && isWhite)
	$: toPlace = $toPlaceArr[side]

	function classPiece(rank) {
		if (rank) return isBlack ? "unicorn-black" : "unicorn-white"
		else return isBlack ? "paladin-black" : "paladin-white"
	}

	function rotate(delta) {
		return function () {
			socket.emit("set_rotation", room, ($rotation + delta + 4) % 4)
		}
	}

	function place({ detail: i }) {
		if (selected == -1) return
		socket.emit("place_piece", room, selected > 4 ? 1 : 0, i)
		selected = -1
	}
</script>

<style>
.selected {
	filter: saturate(2);
}
</style>

<section class="flex flex-col justify-center">
	<Board rotation={$rotation} on:click={place}>
		{#each $pieces as piece (piece)}
			<Piece {...piece} />
		{/each}
	</Board>
	{#if canRotate}
		<div class="flex justify-center items-center text-xl">
			<button class="p-2 m-2" on:click={rotate(-1)}>↪️</button>
			<p>Rotate the board</p>
			<button class="p-2 m-2" on:click={rotate(1)}>↩️</button>
		</div>
	{/if}
	<h2 class="text-4xl text-center">
		{canPlace ? "Place your pieces" : "Your opponent is placing his pieces"}
	</h2>
	{#if canPlace}
		<ol
			class="flex justify-center transform scale-75"
			style="--transform-translate-y: -12.5%"
		>
			{#each Array(toPlace.paladin) as _, i}
				<li
					class="m-4 escampe cursor-pointer {classPiece(0)}"
					class:selected={selected == i}
					on:click={() => (selected = i)}
				></li>
			{/each}
			{#if toPlace.unicorn}
				<li
					class="m-4 escampe cursor-pointer {classPiece(1)}"
					class:selected={selected == 5}
					on:click={() => (selected = 5)}
				></li>
			{/if}
		</ol>
	{/if}
</section>
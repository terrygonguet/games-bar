<script>
	import { stateProp } from "~stores"
	import { getSocket } from "~tools"
	import Board from "~components/escampe/Board"
	import Piece from "~components/escampe/Piece"
	import Roster from "~components/escampe/Roster"

	export let state
	export let room

	const socket = getSocket("escampe")
	const players = stateProp(state, "players")
	const phase = stateProp(state, "phase")
	const rotation = stateProp(state, "rotation")
	const toPlaceArr = stateProp(state, "toPlace")
	const pieces = stateProp(state, "pieces")
	let selected = -1, selectedRank, isDone = false

	$: side = $players.indexOf(socket.id)
	$: isPlayer = side != -1
	$: isWhite = isPlayer && side == 0
	$: isBlack = isPlayer && side == 1
	$: canRotate = $phase == 1 && isBlack
	$: canPlace = canRotate || ($phase == 2 && isWhite)
	$: toPlace = $toPlaceArr[side]

	$: process.dev && onChangeCanPlace(canPlace)

	function rotate(delta) {
		return function () {
			socket.emit("set_rotation", room, ($rotation + delta + 4) % 4)
		}
	}

	function place({ detail: i }) {
		if (!canPlace) return
		socket.emit("place_piece", room, selectedRank, i)
		selected = -1
	}

	function done() {
		isDone = true
		socket.emit("done_placing", room)
	}

	// dev utility
	function onChangeCanPlace() {
		if (canPlace) {
			let i = 0
			socket.emit("place_piece", room, 0, (i++) + (isBlack ? 24 : 0))
			socket.emit("place_piece", room, 0, (i++) + (isBlack ? 24 : 0))
			socket.emit("place_piece", room, 0, (i++) + (isBlack ? 24 : 0))
			socket.emit("place_piece", room, 0, (i++) + (isBlack ? 24 : 0))
			socket.emit("place_piece", room, 0, (i++) + (isBlack ? 24 : 0))
			socket.emit("place_piece", room, 1, (i++) + (isBlack ? 24 : 0))
			setTimeout(() => socket.emit("done_placing", room), 50)
		}
	}
</script>

<section class="flex flex-col justify-center">
	<Board
		rotation={$rotation}
		on:click={place} scale={75}
		mirror={isWhite}
		placementMode={canPlace}
		glow={canPlace}
	>
		{#each $pieces as piece (piece)}
			<Piece {...piece} mirror={isWhite} />
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
		{canPlace ? "Place your pieces" : "Your opponent is placing their pieces"}
	</h2>
	{#if !isDone}
		<Roster
			{...toPlace}
			bind:selected
			player={side}
			bind:selectedRank
			scale={75}
			on:done={done} />
	{/if}
</section>
<script>
	import { fade } from "svelte/transition"
	import { goto } from '@sapper/app'

	let room = ""

	function go() {
		if (!room) return
		goto(`game/escampe/${room}`)
	}
</script>

<svelte:head>
	<title>Games Bar - Escampe</title>
</svelte:head>

<main
	class="flex flex-col items-center py-12 px-2"
	in:fade={{ duration: 200, delay: 200 }}
	out:fade={{ duration: 200 }}>
	<h1 class="text-4xl font-semibold mb-4">Escampe</h1>
	<h2 class="text-2xl font-semibold my-4">Rules</h2>
	<section class="max-w-1k text-justify">
		<p class="my-4 text-center">
			This game is played in two phases: <strong>placement</strong> and <strong>playing</strong>.
		</p>
		<h3 class="font-bold text-2xl my-4">Placement</h3>
		<p class="my-4">
			When joining the game you can choose your side, either White or Black (or green-ish). Each player has six pieces: five identical knights and one queen. Black places first and chooses the orientation of the board then White can place his pieces on the opposite side. Both players can only place pieces on the two rows closest to their side of the board.
		</p>
		<h3 class="font-bold text-2xl my-4">Playing</h3>
		<p class="my-4">
			Once all the pieces have been placed the game starts and White plays first. On the first round, White can move any of their pieces. The rules for moving pieces are:
		</p>
		<ul class="my-4 list-disc pl-16">
			<li>All knights and queens move the same way</li>
			<li>A piece <strong>must</strong> move by the same number of squares as there are circles on its starting square</li>
			<li>No piece can move diagonally, only to adjacent empty squares</li>
			<li>No piece can move over any other, including your own</li>
			<li>When moving, a piece cannot move through a square twice (it cannot retrace its steps)</li>
			<li>The last sqare of a move has to be either empty or the opponent's queen</li>
			<li>Only the queen can be taken, ending the game. knights cannot be taken</li>
		</ul>
		<p class="my-4">
			On any player's turn they can only move pieces that are on squares with the same number or circles as the the last square of the previous player's move. For example, if White moves a knight from a square with 2 circles to one with 3, the Black can only play pieces that are on a square with 3 circles at the start of their turn. If a player cannot make a legal move (they have no piece on the correct squares or they are all blocked) they have to skip their turn and their opponent plays again.
		</p>
		<p class="my-4">
			The game ends when one player takes the opponent's queen and wins.
		</p>
	</section>
	<form onsubmit="return false">
		<label>
			Create or join room:
			<input
				type="text"
				name="room"
				bind:value={room}
				class="inpt m-2"
				placeholder="Room name"/>
		</label>
		<button disabled={!room} class="btn" on:click={go}>GO</button>
	</form>
</main>

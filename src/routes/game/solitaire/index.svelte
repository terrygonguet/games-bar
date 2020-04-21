<script>
	import { fade } from "svelte/transition"
	import { goto } from '@sapper/app'

	let room = ""

	function go() {
		if (!room) return
		goto(`game/solitaire/${room}`)
	}
</script>

<svelte:head>
	<title>Games Bar - Solitaire</title>
</svelte:head>

<main
	class="flex flex-col items-center pt-24"
	in:fade={{ duration: 200, delay: 200 }}
	out:fade={{ duration: 200 }}>
	<h1 class="text-4xl font-semibold mb-4">Solitaire</h1>
	<h2 class="text-2xl font-semibold my-4">Rules</h2>
	<section class="max-w-1k text-justify">
		<p class="my-4">
			The game starts with a seven by four grid of face down cards,
			three more face down in the reserve and one in your hand revealed
			totalling 32 cards: the four aces and cards from seven to King.
			As the name implied, this game is played alone so you can start
			immediately. Above and to the right of the grid you will see ranks
			and suits, indicating where to place each card. You can swap the
			card in your hand with the card that is face down where yours is
			supposed to go. If you pick up anything between a seven and a King
			you continue to replace cards normally. If you pick up an ace you
			have to place it in the rightmost column and a new card will be
			automatically placed from the reserve in your hand.
		</p>
		<p class="my-4">
			The goal of the game is to swap all the cards in the grid with the
			correct one before revealing all four aces. Once place the last ace
			the game is over an any card that is still face down is revealed.
			you win if all the cards are in their place and lose otherwise.
		</p>
		<p class="my-4">
			If you enter a room where someone is already playing you will spectate
			the game but will not be able to influence anything.
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

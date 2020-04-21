<script context="module">
	export function preload({ path, params, query }) {
		const room = params.room
		return { room }
	}
</script>

<script>
	import { fade } from "svelte/transition"
	import { capitalize, getSocket, rateLimit } from "~tools"
	import { onMount } from "svelte"
	import { writable } from "svelte/store"
	import { makeStateFromSocket } from "~stores"

	export let room

	const socket = getSocket("solitaire")
	let state = writable(null) // temp value
	let mx = 0, my = 0, grid, gridRect, cardX = 0, cardY = 0
	const emitMoveHand = rateLimit(() => {
		const { x, y, width, height } = gridRect
		socket.emit("move_hand", room, {
			x: (mx - x) / width,
			y: (my - y) / height
		})
	}, 1000 / process.env.RATE_LIMIT)

	$: isPlayer = $state && $state.player == socket.id
	$: {
		if (isPlayer) {
			cardX = mx
			cardY = my
		} else if (gridRect && $state) {
			cardX = $state.cardPos.x * gridRect.width + gridRect.x
			cardY = $state.cardPos.y * gridRect.height + gridRect.y
		}
	}

	function onMouseMove(e) {
		if (!isPlayer) return
		mx = e.clientX
		my = e.clientY
		if ($state.state == "playing" && $state.hasSpectator) emitMoveHand()
	}

	function onClickCard(i) {
		socket.emit("swap_card", room, i)
	}

	function onClickAce(i) {
		socket.emit("place_ace", room, i)
	}

	function cardClasses(card) {
		return card.hidden ? "card card-back" : `card suit-${card.suit} rank-${card.rank}`
	}

	onMount(() => {
		socket.emit("join", room)
		state = makeStateFromSocket(socket, room)
		mx = innerWidth / 2
		my = innerHeight / 2
		gridRect = grid.getBoundingClientRect()
		return () => socket.emit("leave", room)
	})
</script>

<style>
#grid {
	display: grid;
	grid-template-rows: repeat(4, auto);
	grid-template-columns: repeat(7, auto);
	grid-gap: 1rem;
}

#suits {
	writing-mode: vertical-lr;
}
</style>

<svelte:head>
	<title>Games Bar - Solitaire - {room}</title>
</svelte:head>

<svelte:window on:mousemove={onMouseMove}/>

<main
	class="flex items-center flex-col bg-green-800 text-white overflow-x-hidden"
	in:fade={{ duration: 200, delay: 200 }}
	out:fade={{ duration: 200 }}>
	<h1 class="text-4xl font-semibold text-center mb-8">Solitaire - {room}</h1>
	
	{#if $state && $state.state}
		{#if $state.state == "won"}
			<div class="bg-green-500 text-5xl font-bold w-full mb-6 flex justify-center items-center">
				<p class="mx-8">You won!</p>
				<a class="btn text-lg" href="game/solitaire">New game</a>
			</div>
		{:else if $state.state == "lost"}
			<div class="bg-red-500 text-5xl font-bold w-full mb-6 flex justify-center items-center">
				<p class="mx-8">You lost...</p>
				<a class="btn text-lg" href="game/solitaire">New game</a>
			</div>
		{/if}
	{/if}

	<section class="flex m-4 ml-8 relative">
		<div id="grid" class="m-4 relative" bind:this={grid}>
			<div class="absolute left-0 h-full flex justify-evenly transform -translate-x-full text-xl" id="suits">
				<p>Clubs <span class="text-black">♣️️</span></p>
				<p>Diamonds <span class="text-red-500">♦️️</span></p>
				<p>Spades <span class="text-black">♠️️</span></p>
				<p>Hearts <span class="text-red-500">♥️️</span></p>
			</div>
			<div class="absolute top-0 w-full flex transform -translate-y-full text-xl pb-4 gap-4" id="ranks">
				<p class="flex-1 text-center">7</p>
				<p class="flex-1 text-center">8</p>
				<p class="flex-1 text-center">9</p>
				<p class="flex-1 text-center">10</p>
				<p class="flex-1 text-center">Jack</p>
				<p class="flex-1 text-center">Queen</p>
				<p class="flex-1 text-center">King</p>
			</div>
			{#each $state ? $state.grid : [] as card, i}
				<div
					class={cardClasses(card)}
					on:click={() => onClickCard(i)} />
			{/each}
		</div>
		<div id="aces" class="rounded bg-red-900 p-4 grid grid-rows-4 gap-4 relative">
			<p class="text-xl font-bold absolute top-0 w-full text-center transform -translate-y-full">ACES</p>
			{#each $state ? $state.aces : Array(4).fill(null) as card, i}
				{#if card}
					<div class="card suit-{card.suit} rank-{card.rank}" />
				{:else}
					<div class="w-card h-card rounded border" on:click={() => onClickAce(i)}/>
				{/if}
			{/each}
		</div>
	</section>
	{#if $state && $state.hand}
		<div
			class="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none {cardClasses($state.hand)}"
			style="top:{cardY}px;left:{cardX}px" />
	{/if}
	<p>Reserve</p>
	<div class="flex gap-4 h-card min-w-card p-4 box-content border rounded">
		{#each $state ? $state.reserve : [] as card}
			<div class={cardClasses(card)} />
		{/each}
	</div>
</main>

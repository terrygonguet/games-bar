<script>
	import { fade } from "svelte/transition"
	import { goto } from '@sapper/app'

	let room = ""

	function go() {
		if (!room) return
		goto(`game/petitbac/${room}`)
	}
</script>

<svelte:head>
	<title>Games Bar - Petit Bac</title>
</svelte:head>

<main
	class="flex flex-col items-center pt-24"
	in:fade={{ duration: 200, delay: 200 }}
	out:fade={{ duration: 200 }}>
	<h1 class="text-4xl font-semibold mb-4">Petit Bac</h1>
	<h2 class="text-2xl font-semibold my-4">Règles</h2>
	<section class="max-w-1k text-justify">
		<p class="my-4">
			Lorem ipsum, dolor sit amet consectetur adipisicing elit. Nihil itaque magnam nam veritatis quo dolore tempora, iste sunt temporibus dicta iure animi natus velit eaque? Cupiditate asperiores at sunt quidem.
		</p>
		<p class="my-4">
			Tempor ad amet ea cillum aliqua consectetur cillum consequat eiusmod esse dolor fugiat. Commodo aute aliquip culpa magna quis. Dolore cillum ex aliquip anim.
		</p>
	</section>
	<form onsubmit="return false">
		<label>
			Créer ou rejoindre un jeu:
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

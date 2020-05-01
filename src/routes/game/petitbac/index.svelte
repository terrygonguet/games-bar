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
	class="flex flex-col items-center py-12 px-2"
	in:fade={{ duration: 200, delay: 200 }}
	out:fade={{ duration: 200 }}>
	<h1 class="text-4xl font-semibold mb-4">Petit Bac</h1>
	<h2 class="text-2xl font-semibold my-4">Règles</h2>
	<section class="max-w-1k text-justify">
		<p class="my-4">
			This games is in French because my friends are.
		</p>
		<p class="my-4">
			Un petit bac classique. Le premier joueur dans une pièce est le 👑,
			c'est le seul qui peut choisir les catégories avant de commencer et
			c'est le seul qui peut choisir de commencer un round et de passer à
			l'étape suivante à la fin d'un round. Un round se déroule en 3 phases:
		</p>
		<ol class="my-4 list-decimal pl-8">
			<li>Creusage de méninges</li>
			<li>Édition des réponses</li>
			<li>Tableau des scores</li>
		</ol>
		<p class="my-4">
			La première phase est évidente: c'est le jeu lui même. Une lettre est
			tirée au hasard et chaque joueur dois trouver un mot par catégorie qui
			commence par cette lettre. Une fois qu'un joueur a une réponse pour toutes
			les catégories il peut terminer la phase et on passe à l'édition des réponses.
		</p>
		<p class="my-4">
			Si une des réponses d'un joueur est invalide (ou que deux joueurs ont
			donné le même mot avec une orthographe différente) on peut annuler les
			réponses dans cette phase. Seul le 👑 peut avancer à la prochaine phase.
		</p>
		<p class="my-4">
			La dernière phase est simplement un affichage des scores pendant lequel
			le premier peut se moquer du manque d'organisation mentale des autres
			joueurs. Encore une fois, seul le 👑 peut lancer le round suivant.
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

<script>
	import { fade } from "svelte/transition"
</script>

<style>
#hero {
	height: 70vh;
}

#shadow {
	box-shadow: inset 0px -20px 10px -10px white;
}

ul {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
	grid-auto-rows: minmax(150px, 1fr);
	grid-gap: 1rem;
}

.escampe-gradient {
	background: linear-gradient(-90deg, #38B2AC, #4FD1C5);
}
</style>

<svelte:head>
	<title>Games Bar - Home</title>
</svelte:head>

<main
	class="flex flex-col items-center relative"
	in:fade={{ duration: 200, delay: 200 }}
	out:fade={{ duration: 200 }}>

	<section id="hero" class="relative flex-center w-full">
		<h1 class="z-20 text-white px-6 py-4 font-semibold text-3xl md:text-5xl font-serif text-center text-gray-100 bg-gray-800">
			THE<br>
			GAMES BAR
		</h1>
		<div id="shadow" class="w-full h-full z-10 absolute top-0 left-0" />
		<picture>
			<img
				src="img/hero.jpg"
				alt="Checkerboard and Playing Cards (1915) by Juan Gris"
				class="w-full h-full object-cover absolute top-0 left-0 z-0 opacity-75 select-none"
			>
		</picture>
	</section>

	<section class="m-auto max-w-1k w-full p-4">
		<h2 class="uppercase text-2xl md:text-3xl font-semibold text-center mb-6">
			Welcome to the Games Bar, we got games!
		</h2>
		<ul class="w-full">
			<li class="col-span-2 relative escampe-gradient transform transition-transform ease-in-out duration-300 hover:scale-105 border border-black">
				<a href="game/escampe" class="w-full h-full block p-4">
					<h3 class="text-2xl">Escampe</h3>
					<p class="text-base mt-2">"Blitz Chess"</p>
					<div class="absolute bottom-0 right-0 flex transform scale-75">
						<div class="escampe unicorn-white" />
						<div class="escampe paladin-black" />
					</div>
				</a>
			</li>
			<li class="col-span-2 relative transform transition-transform ease-in-out duration-300 hover:scale-105 border border-black">
				<a href="game/solitaire" class="w-full h-full block p-4">
					<h3 class="text-2xl">Chess</h3>
					<p class="text-base mt-2">"Old but gold"</p>
					<div class="piece black-knight absolute bottom-0 right-0" />
				</a>
			</li>
			<li class="col-span-2 relative bg-green-800 transform transition-transform ease-in-out duration-300 hover:scale-105 border border-black">
				<a href="game/solitaire" class="w-full h-full block p-4">
					<h3 class="text-2xl">Solitaire</h3>
					<p class="text-base mt-2">"Wait this isn't Klondike"</p>
					<div class="absolute bottom-0 right-0 flex transform scale-75">
						<div class="card suit-spades rank-1 -mx-4" />
						<div class="card suit-hearts rank-1 -mx-4" />
						<div class="card suit-clubs rank-1 -mx-4" />
						<div class="card suit-diamonds rank-1 -mx-4" />
					</div>
				</a>
			</li>
			<li class="col-span-2 relative transform transition-transform ease-in-out duration-300 hover:scale-105 border border-black">
				<a href="game/solitaire" class="w-full h-full block p-4">
					<h3 class="text-2xl">
						Petit Bac
						<span class="md:hidden">🇫🇷</span>
						<span class="hidden md:inline">(French)</span>
					</h3>
					<p class="text-base mt-2">"Non Kuala Lumpur ne commence <strong>pas</strong> par Q"</p>
				</a>
			</li>
		</ul>
	</section>
</main>

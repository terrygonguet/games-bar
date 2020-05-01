<script>
	import { capitalize } from "~tools"
	import { onMount, createEventDispatcher } from "svelte";
	import { getSocket } from "~tools"

	export let state
	export let room

	const socket = getSocket("petitbac")
	const emit = createEventDispatcher()
	let categories = $state.categories
	let next,
		nextValue = "",
		everybodyCanRefuse = $state.everybodyCanRefuse

	$: nbPlayers = Object.keys($state.players).length

	function onKeydownNext(e) {
		if (e.key == "Enter") add()
		else if (e.key == "Backspace" && !nextValue && categories.length) {
			e.preventDefault()
			nextValue = categories[categories.length - 1]
			remove(categories.length - 1)()
		}
	}

	function onKeydown(i) {
		return e => {
			if (e.key == "Enter") next.focus()
			else if (e.key == "Backspace" && !categories[i]) {
				e.preventDefault()
				remove(i)()
			}
		}
	}

	function onChangeOption() {
		socket.emit("set_refuse", room, everybodyCanRefuse)
	}

	function add() {
		if (!nextValue) return
		categories = [...categories, capitalize(nextValue)]
		nextValue = ""
		save()
		next.focus()
	}

	function remove(i) {
		return function() {
			categories = categories.filter((_, j) => i != j)
			save()
		}
	}

	function save() {
		socket.emit("set_categories", room, categories)
	}

	function go() {
		save()
		emit("ready")
	}

	onMount(() => {
		next.focus()
		if (process.dev) emit("ready")
	})
</script>

<section class="flex flex-col w-full md:max-w-lg pb-8 md:pb-16">
	<h2 class="text-2xl font-semibold text-center m-4">Options</h2>
	<label class="text-center">
		Tout le monde peut refuser les mots
		<input
			type="checkbox"
			bind:checked={everybodyCanRefuse}
			on:change={onChangeOption}
		/>
	</label>
	<h2 class="text-2xl font-semibold text-center m-4">Catégories</h2>
	<p class="text-base text-gray-700 m-2 text-center">(Seul le 👑 peut modifier les catégories)</p>
	{#each categories as category, i}
		<div class="flex">
			<input
				type="text"
				class="inpt m-2 flex-1"
				bind:value={categories[i]}
				on:keydown={onKeydown(i)}
			>
			<button class="btn btn-err m-2" on:click={remove(i)}>✖</button>
		</div>
	{/each}
	<div class="flex">
		<input
			type="text"
			class="inpt m-2 flex-1"
			bind:value={nextValue}
			bind:this={next}
			on:keydown={onKeydownNext}
		>
		<button class="btn m-2" on:click={add}>➕</button>
	</div>
	<button class="btn flex-1 m-2" on:click={go}>GO ({nbPlayers} joueurs)</button>
</section>
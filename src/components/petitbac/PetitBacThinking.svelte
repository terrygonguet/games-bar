<script>
	import { getSocket, last, debounce } from "~tools"
	import { onMount } from "svelte"

	export let state
	export let room

	const socket = getSocket("petitbac")
	const setWords = debounce(() => socket.emit("set_words", room, words), 1500)
	let table,
		words = Array($state.categories.length).fill("")

	$: letter = last($state.rounds).letter
	$: finished = words.every(Boolean)

	function onKeydown(e) {
		if (e.key == "Enter" && finished) finish()
		else setWords()
	}

	function finish() {
		socket.emit("finish_round", room, words)
	}

	onMount(() => {
		const firstInput = table.querySelector("input")
		firstInput.focus()
		if (process.dev) {
			words = words.map(() => Math.floor(Math.random() * 3) + 1 + "")
			socket.emit("set_words", room, words)
			setTimeout(finish, 5000)
		}
	})
</script>

<style>
tr, th, td, input {
	transition: background-color 0.3s ease-out;
}
</style>

<p class="text-base text-gray-700 mb-4 text-center hidden md:block">
	(Les touches <code class="rounded border bg-gray-200 px-1">Tab</code>
	et <code class="rounded border bg-gray-200 px-1">Maj + Tab</code> sont
	utiles pour passer d'une catégorie à une autre rapidement)
</p>
<table bind:this={table} class="relative">
	<thead>
		<tr class="border-b bg-white sticky top-0 z-10">
			<th class="p-2">Catégories</th>
			<th class="p-2">{letter}</th>
		</tr>
	</thead>
	<tbody>
		{#each $state.categories as category, i}
			<tr class="focus-within:bg-blue-100 border-b">
				<td class="p-2 text-center">{category}</td>
				<td class="p-2">
					<input
						type="text"
						class="focus:bg-blue-100"
						bind:value={words[i]}
						on:keydown={onKeydown}
					>
				</td>
			</tr>
		{/each}
		{#if finished}
			<tr>
				<td colspan=2 class="pt-4 pb-16">
					<button class="btn w-full" on:click={finish}>Fini !</button>
				</td>
			</tr>
		{/if}
	</tbody>
</table>

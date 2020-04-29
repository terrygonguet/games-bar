<script>
	import { last, getSocket } from "~tools"

	export let state
	export let room

	const socket = getSocket("petitbac")
	let hovered = -1

	$: round = last($state.rounds)
	$: ids = Object.keys(round.words)
	$: isKing = $state.king == socket.id
	$: canRefuse = $state.everybodyCanRefuse || isKing
	$: uniques = computeUniques(round.words)

	function refuse(id, i) {
		return function () {
			if (canRefuse && confirm("⚠ Êtes vous sûr(e) ? Cette action ne peut pas être annulée ⚠"))
				socket.emit("refuse_word", room, id, i)
		}
	}

	function computeUniques(words) {
		const uniquesEntries = [],
			wordsEntries = Object.entries(words)

		function nbWordsAt(word, i) {
			let total = 0
			for (const [, l] of wordsEntries) {
				if (l[i] == word) total++
			}
			return total
		}

		for (const [id, list] of wordsEntries) {
			uniquesEntries.push([id, list.map((w, i) => w && nbWordsAt(w, i) == 1)])
		}

		return Object.fromEntries(uniquesEntries)
	}

	function computeScores() {
		socket.emit("compute_score", room)
	}
</script>

<style>
tr, th, td {
	transition: background-color 0.3s ease-out;
}
</style>

<section class="max-w-full overflow-x-auto md:p-1">
	<table on:mouseleave={() => (hovered = -1)} class="relative">
		<thead>
			<tr class="border-b sticky top-0 z-20 bg-white">
				<th class="p-2" on:mouseenter={() => (hovered = -1)}></th>
				{#each ids as id, i (id)}
					<th
						class="p-2 text-center"
						class:bg-blue-100={hovered == i}
						on:mouseenter={() => (hovered = i)}
					>
						{$state.players[id].name}&nbsp;{$state.king == id ? "👑" : ""}
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each $state.categories as category, i (category)}
				<tr class="hover:bg-blue-100 border-b" on:mouseenter={() => (hovered = -1)}>
					<td class="p-2 text-right">{category}</td>
					{#each ids as id, j (id)}
						<td
							class="text-center group relative p-2"
							on:mouseenter={() => (hovered = j)}
							class:bg-blue-100={hovered == j}
						>
							{round.words[id][i]}
							<span class="text-sm">{uniques[id][i] ? "✔️" : "⭕"}</span>
							{#if canRefuse}
								<button
									class="absolute top-0 right-0 p-1 hidden group-hover:block text-xs"
									on:click={refuse(id, i)}
								>
									❌
								</button>
							{/if}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
	{#if isKing}
		<button class="btn my-4 mx-auto block" on:click={computeScores}>Calculer le score</button>
	{/if}
</section>
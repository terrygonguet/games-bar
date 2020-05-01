<script>
	import { getSocket } from "~tools"

	export let state
	export let room

	const socket = getSocket("petitbac")

	$: players = Object.entries($state.players)
					.sort(([, { score:a }], [, { score:b }]) => b - a)
	$: isKing = $state.king == socket.id

	function nextRound() {
		socket.emit("start_round", room)
	}
</script>

<h2 class="text-2xl font-semibold text-center m-4">Score</h2>
<table>
	<tbody>
		{#each players as [id, { name, score }] (id)}
			<tr class="border-b">
				<th class="p-2 text-right">{$state.king == id ? "👑" : ""}&nbsp;{name}</th>
				<td class="p-2 text-center w-24">{score}</td>
			</tr>
		{/each}
	</tbody>
</table>
{#if isKing}
	<button class="btn m-4" on:click={nextRound}>Nouveau round</button>
{/if}
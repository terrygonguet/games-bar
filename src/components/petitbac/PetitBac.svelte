<script>
	import PetitBacPreparingKing from "~components/petitbac/PetitBacPreparingKing"
	import PetitBacPreparing from "~components/petitbac/PetitBacPreparing"
	import PetitBacThinking from "~components/petitbac/PetitBacThinking"
	import PetitBacScoring from "~components/petitbac/PetitBacScoring"
	import PetitBacScoreboard from "~components/petitbac/PetitBacScoreboard"
	import { getSocket } from "~tools"

	export let state
	export let room

	const socket = getSocket("petitbac")

	$: isKing = $state.king == socket.id

	function ready() {
		socket.emit("start_round", room)
	}
</script>

{#if isKing}
	<span class="absolute top-0 right-0 m-4 text-2xl md:text-4xl" title="Vous êtes le 👑">👑</span>
{/if}

{#if $state.state == "preparing"}
	{#if isKing}
		<PetitBacPreparingKing {state} {room} on:ready={ready} />
	{:else}
		<PetitBacPreparing {state} {room} />
	{/if}
{:else if $state.state == "thinking"}
	<PetitBacThinking {state} {room} />
{:else if $state.state == "scoring"}
	<PetitBacScoring {state} {room} />
{:else if $state.state == "scoreboard"}
	<PetitBacScoreboard {state} {room} />
{/if}
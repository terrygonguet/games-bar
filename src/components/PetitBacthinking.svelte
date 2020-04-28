<script>
	import { getSocket } from "~tools"

	export let state
	export let room

	const socket = getSocket("petitbac")
</script>

<pre>{JSON.stringify($state, null, 2)}</pre>
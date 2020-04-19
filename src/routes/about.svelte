<script>
	import { fade } from "svelte/transition";
</script>

<svelte:head>
  <title>Games Bar - About</title>
</svelte:head>

<main
  class="flex-center absolute w-full h-full"
  in:fade={{ duration: 200, delay: 200 }}
  out:fade={{ duration: 200 }}>
  <p>About</p>
  <a href="/">home</a>
</main>

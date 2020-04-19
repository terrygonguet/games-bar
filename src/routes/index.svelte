<script>
	import { fade } from "svelte/transition";
</script>

<svelte:head>
  <title>Games Bar - Home</title>
</svelte:head>

<main
  class="flex-center absolute w-full h-full"
  in:fade={{ duration: 200, delay: 200 }}
  out:fade={{ duration: 200 }}>
  <p>YO</p>
  <a href="about">about</a>
</main>

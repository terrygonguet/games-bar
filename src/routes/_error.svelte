<script>
  import { fade } from "svelte/transition";

  export let status;
  export let error;

  const dev = process.env.NODE_ENV === "development";
</script>

<svelte:head>
  <title>Games Bar - Error {status}</title>
</svelte:head>

<main
  class="overflow-hidden flex-center flex-col"
  in:fade={{ duration: 200, delay: 200 }}
  out:fade={{ duration: 200 }}>
  <div class="m-4 max-w-1k max-h-full overflow-auto">
    <h1 class="m-10 text-4xl font-bold text-center">{status}</h1>
    <p class="m-10 text-2xl font-semibold text-center">{error.message}</p>
    {#if dev && error.stack}
      <pre>{error.stack}</pre>
    {/if}
  </div>
</main>

<script>
  let inpt = "", konami
  function handleKeyDown(e) {
    inpt = (inpt + e.key).slice(-100)
    if (inpt.endsWith("ArrowUpArrowUpArrowDownArrowDownArrowLeftArrowRightArrowLeftArrowRightba")) {
      import("../components/Konami").then(k => (konami = k.default))
    }
  }
</script>

<svelte:window on:keydown={handleKeyDown}/>

<slot />
{#if konami}
  <svelte:component this={konami} />
{/if}

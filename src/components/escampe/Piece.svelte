<script>
	export let rank
	export let side
	export let position

	$: className = `${rank ? "unicorn" : "paladin"}-${side ? "black" : "white"}`
	$: x = position % 6
	$: y = Math.floor(position / 6)
</script>

<div
	class="absolute transform transition-transform duration-500 ease-in-out mx-4 -mt-2 pointer-events-none"
	style="--transform-translate-x:{x * 140}px;--transform-translate-y:{y * 140}px;width:140px;height:140px"
>
	<div class="escampe {className} m-auto"></div>
</div>
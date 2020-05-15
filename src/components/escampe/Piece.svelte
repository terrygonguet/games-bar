<script>
	export let rank
	export let side
	export let position
	export let mirror = false

	$: className = `${rank ? "unicorn" : "paladin"}-${side ? "black" : "white"}`
	$: x = position % 6
	$: y = Math.floor(position / 6)
	$: rx = mirror ? 5 - x : x
	$: ry = mirror ? 5 - y : y
</script>

<div
	class="absolute transform transition-transform duration-500 ease-in-out mx-4 -mt-4 pointer-events-none"
	style="--transform-translate-x:{rx * 140}px;--transform-translate-y:{ry * 140}px;width:140px;height:140px"
>
	<div class="escampe {className} m-auto"></div>
</div>
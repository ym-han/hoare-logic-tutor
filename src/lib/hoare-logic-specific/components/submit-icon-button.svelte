<script lang="ts" module>
	export interface SubmitIconButtonProps {
		disabled: boolean;
		onclick: () => Promise<void>;
	}
</script>

<script lang="ts">
	import { Button } from '$lib/components/base/button/index.ts';
	import { ArrowRightCircleIcon } from 'svelte-feather-icons';

	const { disabled = false, onclick }: SubmitIconButtonProps = $props();

	let labelColorStyle = $derived(disabled ? 'text-muted-foreground' : 'text-foreground');
</script>

<Button
	{disabled}
	{onclick}
	variant="ghost"
	class="items-center gap-2 leading-none disabled:cursor-not-allowed disabled:opacity-60"
>
	<!-- Nov 2024: For some reason, I get an error
		"content.js:1 Uncaught SyntaxError: Failed to execute 'querySelectorAll' on 'Document': '.[&>svg]\:block' is not a valid selector."
		in chrome when `[&>svg]:block` is inlined into the CSS class for Button -->
	<span class="text-xs {labelColorStyle}">Submit</span>
	<div class="svg-container">
		<ArrowRightCircleIcon
			class="stroke-purple-400 hover:fill-fuchsia-200 hover:stroke-purple-500"
			size="40"
			strokeWidth={1}
		/>
	</div>
</Button>

<style>
	.svg-container > :global(svg) {
		display: block;
	}
</style>

<script lang="ts" module>
	import type { DisplayerProps } from '$lib/alr-core/index.ts';
	import type { FeedbackAlrNode } from '$lib/alr-core/index.ts';

	interface FeedbackDisplayerProps extends DisplayerProps {
		node: FeedbackAlrNode;
	}
</script>

<script lang="ts">
	import { slide } from 'svelte/transition';

	const { context, node }: FeedbackDisplayerProps = $props();

	/** The problem that the use of reactivity here is meant to solve:
	 * When a user changes input in a field that already has feedback,
	 * there needs to be a clear visual indication that their change was registered.
	 *
	 * The perhaps hacky solution here:
	 * - Use $derived to track changes to the feedback node
	 * - Since the feedback node prop is reactive through $props,
	 *   when the node changes, feedbackBody will recompute, triggering the keyframe animation defined below
	 */
	let feedbackBody = $derived(node.getBody(context)?.getContent());
</script>

{#if feedbackBody}
	<!-- Transition wrapper -->
	<div transition:slide|local={{ duration: 420 }} class="pb-2">
		<!-- Feedback body div with key animation -->
		{#key feedbackBody}
			<article
				class="maxwidth-feedback feedback-flash ml-6 mt-2 whitespace-pre-wrap
        border-l-4 border-zinc-300 bg-white pb-1 pl-4 pt-1
        text-sm text-popover-foreground"
			>
				{feedbackBody}
			</article>
		{/key}
	</div>
{/if}

<!-- To understand the rationale for this visual feedback animation, see the comment on `feedbackBody`  -->
<style>
	@keyframes flash {
		0%,
		90% {
			background-color: hsl(var(--neutral));
		}
		50% {
			background-color: hsl(var(--muted));
		}
	}

	.feedback-flash {
		animation: flash 0.6s;
	}

	.maxwidth-feedback {
		max-width: 82%;
	}
</style>

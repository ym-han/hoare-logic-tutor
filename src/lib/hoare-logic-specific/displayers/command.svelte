<script lang="ts" module>
	import type { DisplayerProps } from '$lib/alr-core/index.ts';
	import { CommandAlrNode } from '$lib/hoare-logic-specific/alr/index.ts';
	import {
		FeedbackAlrNode,
		EmptyFeedbackAlrNode,
		getAlrFromSvelteContext,
		type AlrContext,
		type AlrId
	} from '$lib/alr-core/index.ts';
	import { Debounced } from 'runed';
	import { onMount } from 'svelte';

	export interface CommandDisplayerProps extends DisplayerProps {
		node: CommandAlrNode; // specializing the node
	}
</script>

<script lang="ts">
	let { context, node }: CommandDisplayerProps = $props();
	const alr = getAlrFromSvelteContext();

	let feedback: FeedbackAlrNode = $state(new EmptyFeedbackAlrNode({ context, alr }));
	const debouncedFeedback = new Debounced(() => feedback, context.getGlobalConstants()['FEEDBACK_DEBOUNCE_MS']);

	/** Subscribe to updates in the CommandAlrNode
  (in particular, to updates in feedback being set) */
	const renderFeedbackWhenSet = (context: AlrContext, id: AlrId) => {
		if (id === node.getId()) {
			const newFeedback = node.getFeedback(context);
			if (newFeedback && feedback !== newFeedback) feedback = newFeedback;
			// Don't want to unnecessarily update `feedback` variable because updates can trigger visual effects
		}
	};

	onMount(() => {
		alr.subscribe(renderFeedbackWhenSet);
	});
</script>

<div class={debouncedFeedback.current.getAttemptStyles(context).getStyles()}>
	<code>{node.getBody(context).getContent()}</code>
</div>

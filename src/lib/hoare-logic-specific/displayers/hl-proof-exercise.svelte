<script lang="ts" module>
	import type { RootDisplayerProps } from '$lib/alr-core/index.ts';
	import { setAlrInSvelteContext } from '$lib/alr-core/index.ts';
	import {
		type ProofStepAlrNode,
		type CommandAlrNode,
		type HLProofExerciseAlrNode,
		isCommandAlrNode,
		isAssertionHoleAndFeedbackAlrNode
	} from '$lib/hoare-logic-specific/alr/index.ts';
	import { Skip } from '$lib/lang-support/index.ts';
	interface HLProofExerciseDisplayerProps extends RootDisplayerProps {
		node: HLProofExerciseAlrNode;
	}
</script>

<script lang="ts">
	import SubmitIconButton from '$lib/hoare-logic-specific/components/submit-icon-button.svelte';
	import { ProofStepDisplayer } from './index.ts';

	let { context, alr, node }: HLProofExerciseDisplayerProps = $props();
	setAlrInSvelteContext(alr);

	/** 'Display-able' proof steps. */
	const proofSteps = node
		.getProofSteps(context)
		.filter((node) => !isCommandAlrNode(node) || !((node as CommandAlrNode).getCommand() instanceof Skip));
	const assertionHoleAndFeedbackNodes = proofSteps.filter(isAssertionHoleAndFeedbackAlrNode);

	/*
  Dec 16 TODO:

  1. We still do want to ONLY report the bottommost error
  2. BUT we don'twant to disable the exercise at this level once everything has been answered. Not clear that that would be good in any case; and even if we want that, better to do it at another level

  3. The filter blah blah below should just become an all -- remove the length > 0 check etc
  */

	let shouldEnableSubmissionOfStudentAttempt = $derived(
		assertionHoleAndFeedbackNodes.every((node) => node.can$Submit(context))
	);
</script>

<div
	class="mx-auto max-w-[85%]
"
>
	<div class="mx-auto mb-3 max-w-[30%]">
		<SubmitIconButton
			disabled={!shouldEnableSubmissionOfStudentAttempt}
			on:click={async () => {
				await node.submit(context);
			}}
		/>
	</div>
	{#each proofSteps as node}
		<article>
			<div class="py-2">
				<ProofStepDisplayer {context} {node} />
			</div>
		</article>
	{/each}
</div>

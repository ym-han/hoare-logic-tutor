<script lang="ts" module>
	import {
		AlrContext,
		type DisplayerProps,
		type AlrId,
		isIncorrectAttemptFeedbackAlrNode
	} from '$lib/alr-core/index.ts';
	import { FeedbackAlrNode, EmptyFeedbackAlrNode } from '$lib/alr-core/index.ts';
	import type { AssertionHoleAndFeedbackAlrNode } from '$lib/hoare-logic-specific/alr/index.ts';
	import { cleanupBaseCodeMirrorWrapper } from '$lib/utils.ts';
	import { Debounced } from 'runed';

	interface AssertionHoleAndFeedbackDisplayerProps extends DisplayerProps {
		node: AssertionHoleAndFeedbackAlrNode;
	}
</script>

<script lang="ts">
	import { FeedbackDisplayer } from './index.ts';
	import { getAlrFromSvelteContext } from '$lib/alr-core/index.ts';
	import { onMount, onDestroy } from 'svelte';

	import { CodeMirror, CodeMirrorCore } from '$lib/components/input/index.ts';
	import { getImpLanguageSupport } from '$lib/lang-support/index.ts';
	import { basicLezerLinter } from '$lib/lang-support/basic-linter.ts';
	import { autocompletion } from '@codemirror/autocomplete';

	/************************
       Key variables
  *************************/

	const { context, node }: AssertionHoleAndFeedbackDisplayerProps = $props();
	const alr = getAlrFromSvelteContext();

	let feedback: FeedbackAlrNode = $state(new EmptyFeedbackAlrNode({ context, alr }));
	const debouncedFeedback = new Debounced(() => feedback, context.getGlobalConstants()['FEEDBACK_DEBOUNCE_MS']);

	let focusWithinStyle = $derived(
		isIncorrectAttemptFeedbackAlrNode(feedback) ? 'focus-within:border-red-500' : 'focus-within:border-purple-400'
	);
	// let textColorStyle = $state('text-foreground');

	// These don't need to be reactive
	let baseCMWrapper: CodeMirror; // the *component* wrapping CM
	let cmCore: CodeMirrorCore;

	let containerElement: HTMLElement;

	/************************
    CodeMirror extensions
  *************************/

	const otherCodeMirrorExtensions = [autocompletion(), getImpLanguageSupport(), basicLezerLinter()];

	/*********************
    Callbacks
  **********************/

	/** For when Hole buffer's input changes */
	const onInput = async (newDoc: string) => {
		// 1. Update hole with student attempt
		node.getHole(context).setStudentAttempt(context, newDoc);

		// Check if focused so that won't try to, e.g., prevalidate when the CM instance is first initialized
		if (!cmCore.getEditorView().hasFocus) return;

		// 2. Prevalidate if focused
		const prevalidationFeedback = await node.prevalidateStudentAttempt(context);
		node.setFeedback(context, prevalidationFeedback);

		// 3. Publish the fact that onInput
		alr.publish(context, node.getId());
	};

	/*
  TODO: Think more about whether feedback in the AssertionHoleAndFeedbackAlr should be a signal
  */

	/** Subscribe feedback displayer to updates in the AssertionHoleAndFeedbackAlrNode
  (in particular, to updates in feedback being set) */
	const renderFeedbackWhenSet = (context: AlrContext, id: AlrId) => {
		if (id === node.getId()) {
			const newFeedback = node.getFeedback(context);
			if (newFeedback && feedback !== newFeedback) feedback = newFeedback;
			// Don't want to unnecessarily update `feedback` variable because updates will trigger visual effects (e.g. flashing animation)
		}
	};

	// const onShouldDisableChange = (context: AlrContext, id: AlrId) => {
	// 	const hole = node.getHole(context);
	// 	if (id !== hole.getId()) return;

	// 	if (hole.shouldDisable(context) && !cmCore.shouldBeReadOnly()) {
	// 		cmCore.makeReadOnly();
	// 		textColorStyle = 'text-muted-foreground';
	// 	}

	// 	if (!hole.shouldDisable(context) && cmCore.shouldBeReadOnly()) {
	// 		cmCore.makeEditable();
	// 		textColorStyle = 'text-foreground';
	// 	}
	// };

	/************************
      onMount, onDestroy
  *************************/

	onMount(doOnMount);
	function doOnMount(): void {
		cmCore = baseCMWrapper.getRef();

		alr.subscribe(renderFeedbackWhenSet);
		// alr.subscribe(onShouldDisableChange);

		node.setContainerElement(containerElement);
	}

	onDestroy(() => {
		// TODO: Check if we really need these
		cleanupBaseCodeMirrorWrapper(baseCMWrapper);
	});
</script>

<!--
    TODO1: maybe add a comment on the design intent of the CSS here

    TODO2: The CSS is currently quite fragile -- e.g., it's easy to mess up the nesting order of the divs.
    Need to make this less fragile, e.g. with Svelte snippets or wrapper components or some other kind of CSS approach.
  -->
<section bind:this={containerElement}>
	<FeedbackDisplayer node={debouncedFeedback.current} {context} />
	<div
		class="CodeMirrorInputBaseStyles
             insetShadow
             rounded-md
             border-2
             {focusWithinStyle}
             {debouncedFeedback.current.getAttemptStyles(context).getStyles()}"
	>
		<CodeMirror
			bind:this={baseCMWrapper}
			initialInput={node.getHole(context).getPlaceholderPrompt()}
			otherExtensions={otherCodeMirrorExtensions}
			{onInput}
		/>
	</div>
</section>

<style>
	.insetShadow {
		box-shadow: inset 1px 2px 2px 0 rgb(0 0 0 / 0.05);
		box-shadow: 0 2px 0 0 '#9f53f9';
	}
</style>

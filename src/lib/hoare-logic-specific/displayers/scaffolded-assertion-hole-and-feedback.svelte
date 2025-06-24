<script lang="ts" module>
  import {
    AlrContext,
    type DisplayerProps,
    type AlrId,
    isIncorrectAttemptFeedbackAlrNode,
    isEmptyFeedbackAlrNode
  } from '$lib/alr-core/index.ts';
  import { FeedbackAlrNode, EmptyFeedbackAlrNode } from '$lib/alr-core/index.ts';
  import type {
    HoleStyles,
    AssertionHoleAndFeedbackAlrNode,
    ScaffoldedAssertionHoleAndFeedbackAlrNode
  } from '$lib/hoare-logic-specific/alr/index.ts';
  import { makeEnabledHoleStyles, makeReadonlyHoleStyles } from '$lib/hoare-logic-specific/alr/index.ts';
  import { cleanupBaseCodeMirrorWrapper } from '$lib/utils.ts';
  import type { Command as CodeMirrorCommand } from '@codemirror/view';
  import { makeCodeMirrorKeyBinding } from '$lib/components/input/code-mirror-operations.svelte.ts';
  import { Debounced } from 'runed';

  interface AssertionHoleAndFeedbackDisplayerProps extends DisplayerProps {
    node: AssertionHoleAndFeedbackAlrNode | ScaffoldedAssertionHoleAndFeedbackAlrNode;
  }
</script>

<script lang="ts">
  import SubmitIconButton from '$lib/hoare-logic-specific/components/submit-icon-button.svelte';
  import { FeedbackDisplayer } from './index.ts';
  import { getAlrFromSvelteContext } from '$lib/alr-core/index.ts';
  import { onMount, onDestroy } from 'svelte';

  import { CodeMirror, CodeMirrorCore } from '$lib/components/input/index.ts';
  import { getImpLanguageSupport } from '$lib/lang-support/index.ts';
  import { basicLezerLinter } from '$lib/lang-support/basic-linter.ts';
  import { autocompletion } from '@codemirror/autocomplete';
  import { SUBMIT_STUDENT_ATTEMPT_KEYBINDING } from './constants.ts';

  /************************
       Key variables
  *************************/

  const { context, node }: AssertionHoleAndFeedbackDisplayerProps = $props();
  const alr = getAlrFromSvelteContext();

  let can$Submit = $state(false);

  let feedback: FeedbackAlrNode = $state(new EmptyFeedbackAlrNode({ context, alr }));
  const debouncedFeedback = new Debounced(() => feedback, context.getGlobalConstants()['FEEDBACK_DEBOUNCE_MS']);

  // TODO: Think about whether should put focusWithinStyle in FeedbackAlr related styles
  let focusWithinStyle = $derived(
    isIncorrectAttemptFeedbackAlrNode(feedback) ? 'focus-within:border-red-500' : 'focus-within:border-purple-600'
  );
  let holeStyles: HoleStyles = $state(makeEnabledHoleStyles());

  // These don't need to be reactive
  let baseCMWrapper: CodeMirror; // the *component* wrapping CM
  let cmCore: CodeMirrorCore;

  let containerElement: HTMLElement;

  /************************
    CodeMirror extensions
  *************************/

  const submitStudentAttemptCodeMirrorCommand: CodeMirrorCommand = () => {
    if (can$Submit) {
      node.submit(context);
    }
    return true;
    // CM docs: "When the command function returns `false`, further bindings will be tried for the key."
  };

  const otherCodeMirrorExtensions = [
    makeCodeMirrorKeyBinding(SUBMIT_STUDENT_ATTEMPT_KEYBINDING, submitStudentAttemptCodeMirrorCommand),
    autocompletion(),
    getImpLanguageSupport(),
    basicLezerLinter()
  ];

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

    // 3. Check if can submit
    // Don't want to allow submission when, e.g.,
    // there's semantic feedback that student should take into account
    // but student has not done anything to acknowledge that
    can$Submit = isEmptyFeedbackAlrNode(prevalidationFeedback);

    // 4. Publish the fact that assertion hole and feedback node has seen a change in input
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
  const feedbackRenderUnsub = alr.subscribe(renderFeedbackWhenSet);

  // Set up the updating of hole enabled/disabled-related styles
  const hole = node.getHole(context);
  const onHoleShouldDisableChange = (context: AlrContext, id: AlrId) => {
    if (id === hole.getId()) {
      // console.log('------ hole: ', hole.getStudentAttempt(context));
      // console.log('hole should disable', hole.shouldDisable(context));
      // console.log('cmcore readonly status', cmCore.shouldBeReadOnly());
      if (hole.shouldDisable(context) && !cmCore.shouldBeReadOnly()) {
        cmCore.makeReadOnly();
        holeStyles = makeReadonlyHoleStyles();
      }

      if (!hole.shouldDisable(context) && cmCore.shouldBeReadOnly()) {
        cmCore.makeEditable();
        holeStyles = makeEnabledHoleStyles();
      }
    }
  };
  const onHoleDisableUnsub = alr.subscribe(onHoleShouldDisableChange);

  /************************
      onMount, onDestroy
  *************************/

  onMount(doOnMount);
  function doOnMount(): void {
    cmCore = baseCMWrapper.getRef();
    node.setContainerElement(containerElement);

    // Set up the initial hole editable/readonly status
    if (hole.shouldDisable(context)) {
      cmCore.makeReadOnly();
      holeStyles = makeReadonlyHoleStyles();
    }
  }

  onDestroy(() => {
    // TODO: Check if we really need these
    cleanupBaseCodeMirrorWrapper(baseCMWrapper);
    feedbackRenderUnsub.unsubscribe();
    onHoleDisableUnsub.unsubscribe();
  });
</script>

<!--
    TODO1: maybe add a comment on the design intent of the CSS here

    TODO2: The CSS is currently quite fragile -- e.g., it's easy to mess up the nesting order of the divs.
    Need to make this less fragile, e.g. with Svelte snippets or wrapper components or some other kind of CSS approach.
  -->
<section bind:this={containerElement}>
  <FeedbackDisplayer node={debouncedFeedback.current} {context} />
  <div class="flex flex-row items-center justify-between">
    <div
      class="CodeMirrorInputBaseStyles
			       insetShadow
             grow
             rounded-md
             border-2
             {focusWithinStyle}
             {debouncedFeedback.current.getAttemptStyles(context).getStyles()}
             {holeStyles}"
    >
      <CodeMirror
        bind:this={baseCMWrapper}
        initialInput={node.getHole(context).getPlaceholderPrompt()}
        otherExtensions={otherCodeMirrorExtensions}
        {onInput}
      />
    </div>
    <div class="ml-4 shrink-0 grow-0">
      <SubmitIconButton
        disabled={!can$Submit}
        onclick={async () => {
          await node.submit(context);
        }}
      />
    </div>
  </div>
</section>

<style>
  .insetShadow {
    box-shadow: inset 1px 2px 2px 0 rgb(0 0 0 / 0.05);
    box-shadow: 0 2px 0 0 '#9f53f9';
  }
</style>

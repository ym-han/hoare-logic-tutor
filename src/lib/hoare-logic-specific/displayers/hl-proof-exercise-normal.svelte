<script lang="ts" module>
  import type { RootDisplayerProps } from '$lib/alr-core/index.ts';
  import { setAlrInSvelteContext } from '$lib/alr-core/index.ts';
  import {
    type HLProofExerciseAlrNode,
    type Submittable,
    isSkipCommandAlrNode,
    isSubmittable
  } from '$lib/hoare-logic-specific/alr/index.ts';

  /** This is the *non*-scaffolded version */
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
  const proofSteps = node.getProofSteps(context).filter((node) => !isSkipCommandAlrNode(node));
  const submittableNodes = proofSteps.filter(isSubmittable) as Submittable[];

  /*
  Dec 16:
  1. We still do want to ONLY report the bottommost error
  2. BUT we don'twant to disable the exercise at this level once everything has been answered. Not clear that that would be good in any case; and even if we want that, better to do it at another level
  */

  let shouldEnableSubmissionOfStudentAttempt = $derived(submittableNodes.every((node) => node.can$Submit(context)));
  $inspect(shouldEnableSubmissionOfStudentAttempt);

  let exerciseDiv: HTMLDivElement;
  // async function handleSubmitKBShortcut(event: KeyboardEvent) {
  //   const modEnterPressed = (event.ctrlKey || event.metaKey) && event.key === 'Enter';
  //   const weHaveFocus = exerciseDiv && exerciseDiv.contains(document.activeElement);
  //   console.log('event.key:', event.key);
  //   console.log('event.code:', event.code);
  //   console.log('event.ctrlKey:', event.ctrlKey);
  //   console.log('event.metaKey:', event.metaKey);
  //   // console.log('event.target:', event.target);
  //   console.log('we have focus', weHaveFocus);

  //   console.log('handleSubmitKBShortcut event.key', modEnterPressed, weHaveFocus);

  //   if (modEnterPressed && weHaveFocus && shouldEnableSubmissionOfStudentAttempt) {
  //     await node.submit(context);
  //   }
  // }
</script>

<!-- <svelte:window on:keydown={handleSubmitKBShortcut} /> -->

<div
  class="mx-auto max-w-[85%]
"
  bind:this={exerciseDiv}
>
  <div class="mx-auto mb-3 max-w-[30%]">
    <SubmitIconButton
      disabled={!shouldEnableSubmissionOfStudentAttempt}
      onclick={async () => {
        await node.submit(context);
      }}
    />
    <div class="text-tiny -ml-4 -mt-2 font-sans font-extralight text-gray-400">Click to submit</div>
  </div>
  {#each proofSteps as node}
    <article>
      <div class="py-2">
        <ProofStepDisplayer {context} {node} />
      </div>
    </article>
  {/each}
</div>

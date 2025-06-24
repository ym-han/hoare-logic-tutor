<script lang="ts" module>
  import type { RootDisplayerProps } from '$lib/alr-core/index.ts';
  import { setAlrInSvelteContext } from '$lib/alr-core/index.ts';
  import { type HLScaffoldedProofExerciseAlrNode, isSkipCommandAlrNode } from '$lib/hoare-logic-specific/alr/index.ts';

  interface HLScaffoldedProofExerciseDisplayerProps extends RootDisplayerProps {
    node: HLScaffoldedProofExerciseAlrNode;
  }
</script>

<script lang="ts">
  import { ProofStepDisplayer } from './index.ts';

  let { context, alr, node }: HLScaffoldedProofExerciseDisplayerProps = $props();
  setAlrInSvelteContext(alr);

  /** 'Display-able' proof steps. */
  const proofSteps = node.getProofSteps(context).filter((node) => !isSkipCommandAlrNode(node));

  /*
  Dec 16 TODO:

  1. We still do want to ONLY report the bottommost error
  2. BUT we don'twant to disable the exercise at this level once everything has been answered. Not clear that that would be good in any case; and even if we want that, better to do it at another level
  */
</script>

<div
  class="relative mx-auto max-w-[85%]
"
>
  <!-- Guided Practice Banner -->
  <div class="absolute -left-6 -top-11">
    <div class="rounded-t-md bg-teal-600 px-4 py-1 font-sans text-sm font-medium text-cyan-50">GUIDED PRACTICE</div>
  </div>
  {#each proofSteps as node}
    <article>
      <div class="py-2">
        <ProofStepDisplayer {context} {node} />
      </div>
    </article>
  {/each}
</div>

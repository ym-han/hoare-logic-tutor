<script lang="ts" module>
  export interface SubmitIconButtonProps {
    disabled: boolean;
    onclick: () => Promise<void>;
  }
</script>

<script lang="ts">
  import { Button } from '$lib/components/base/button/index.ts';
  import { ArrowUpCircleIcon } from 'svelte-feather-icons';

  const { disabled = false, onclick }: SubmitIconButtonProps = $props();
</script>

<Button
  {disabled}
  {onclick}
  variant="ghost"
  class="items-center gap-2 leading-none disabled:cursor-not-allowed disabled:opacity-65"
>
  <div class="">
    <span class="sr-only">Submit answer</span>
    <ArrowUpCircleIcon
      class="stroke-purple-400 hover:fill-fuchsia-200 hover:stroke-purple-500"
      size="36"
      strokeWidth={disabled ? 1 : 2}
    />
  </div>
</Button>

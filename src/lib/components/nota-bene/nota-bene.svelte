<script lang="ts" module>
  import type { Snippet } from 'svelte';

  interface NotaBeneProps {
    children: Snippet;
  }
</script>

<script lang="ts">
  import { AlertCircleIcon } from 'svelte-feather-icons';

  let { children }: NotaBeneProps = $props();

  import * as Alert from '$lib/components/base/alert/index.js';
</script>

<Alert.Root class="my-5">
  <Alert.Title><div class="flex gap-2 pb-1"><AlertCircleIcon class="h-4 w-4" /> Note</div></Alert.Title>
  <Alert.Description>
    {@render children()}
  </Alert.Description>
</Alert.Root>

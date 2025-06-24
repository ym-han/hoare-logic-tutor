<script lang="ts" module>
  import type { Snippet } from 'svelte';
  // import type { HTMLBlockquoteAttributes } from 'svelte/elements';

  interface BlockquoteProps {
    children: Snippet;
  }
</script>

<script lang="ts">
  let { children }: BlockquoteProps = $props();
</script>

<blockquote class="my-5 ml-6 border-l-8 border-stone-200 pl-3">
  {@render children()}
</blockquote>

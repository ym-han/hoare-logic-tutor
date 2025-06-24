<script lang="ts" module>
  interface CodeSnippetProps {
    lines: string[];
  }
</script>

<script lang="ts">
  let { lines }: CodeSnippetProps = $props();
</script>

<div class="mx-auto my-6 max-w-md">
  <code>
    {lines.join('\n')}
  </code>
</div>

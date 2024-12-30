<script lang="ts" module>
	import type { DisplayerProps } from '$lib/alr-core/index.ts';
	import { RemarkAlrNode } from '$lib/hoare-logic-specific/alr/index.ts';

	export interface RemarkDisplayerProps extends DisplayerProps {
		node: RemarkAlrNode; // specializing the node
	}
</script>

<script lang="ts">
	let { context, node }: RemarkDisplayerProps = $props();
</script>

<div class="ml-12 text-sm text-muted-foreground">
	<p>{node.getBody(context).getContent()}</p>
</div>

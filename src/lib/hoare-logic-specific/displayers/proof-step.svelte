<script lang="ts" module>
	import type { AlrContext } from '$lib/alr-core/index.ts';
	import {
		CommandDisplayer,
		RemarkDisplayer,
		AssertionHoleAndFeedbackDisplayer,
		GivenAssertionDisplayer
	} from './index.ts';
	import {
		isAssertionHoleAndFeedbackAlrNode,
		isCommandAlrNode,
		isGivenAssertionAlrNode,
		isRemarkAlrNode
	} from '$lib/hoare-logic-specific/alr/index.ts';
	import type { Component } from 'svelte';
	import type { ProofStepAlrNode } from '$lib/hoare-logic-specific/alr/index.ts';

	export interface ProofStepBlockProps {
		context: AlrContext;
		node: ProofStepAlrNode;
	}
</script>

<script lang="ts">
	let { context, node }: ProofStepBlockProps = $props();
	import { match, P } from 'ts-pattern';

	const getComponent = (node: ProofStepAlrNode) =>
		match(node)
			.with(P.when(isAssertionHoleAndFeedbackAlrNode), () => AssertionHoleAndFeedbackDisplayer)
			.with(P.when(isGivenAssertionAlrNode), () => GivenAssertionDisplayer)
			.with(P.when(isCommandAlrNode), () => CommandDisplayer)
			.with(P.when(isRemarkAlrNode), () => RemarkDisplayer)
			.exhaustive();

	// Assigning to a variable because cannot just do `<getComponent(node) {context} {node} />`
	const ComponentToDisplay: Component<any> = getComponent(node);
</script>

<ComponentToDisplay {context} {node} />

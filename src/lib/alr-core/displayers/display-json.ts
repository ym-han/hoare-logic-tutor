import { Alr, AlrContext, type AlrNode } from '../internal/core.ts';

export const alrToJson = (_: AlrContext, ir: Alr): Object => {
	const roots = ir.getAvailableRootTypes(_);

	return roots.map((root) => ({
		[root.toString()]: ir
			.getRoot(_, root)
			?.getChildren(_)
			.map((x) => alrNodeToJson(_, x))
	}));
};

const alrNodeToJson = (_: AlrContext, n: AlrNode): Object => {
	return {
		[n.getId().toString()]: [n.toString()],
		children: n.getChildren(_).map((c) => alrNodeToJson(_, c))
	};
};

import type { AlrNode, AlrId, AlrContext, AlrNodeInfo } from './internal/core.ts';
import {DefaultAlrNode} from './internal/core.ts';

/**********************************************
 ********************** Node  *****************
 **********************************************/

const CONTAINER_ALR_NODE_TYPE_NAME = 'ContainerAlrNode';

export const isContainerAlrNode = (x: AlrNode): x is ContainerAlrNode => {
	return x.$type === CONTAINER_ALR_NODE_TYPE_NAME;
};

export class ContainerAlrNode extends DefaultAlrNode {
	readonly $type = CONTAINER_ALR_NODE_TYPE_NAME;
  #children: Array<AlrId>;

	constructor(nodeInfo: AlrNodeInfo, children: Array<AlrNode> = []) {
	  super(nodeInfo);
		this.#children = children.map(n => n.getId());
	}

	getChildren(context: AlrContext): AlrNode[] {
		return this.#children.map(id => context.get(id) as AlrNode);
	}

	map(context: AlrContext, f: <T extends AlrNode>(fContext: AlrContext, node: T) => T): this {
    const newChildren = this.getChildren(context).map(f.bind(null, context));
	  const mappedContainer = new ContainerAlrNode(this.makeNodeInfo(context), newChildren);
		return mappedContainer as this;
	}

	addChild(node: AlrNode): void {
		this.#children.push(node.getId());
	}
}

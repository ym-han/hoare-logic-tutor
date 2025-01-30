// Design note: Not bothering with a `ContentAlrNode` class that the `MarkdownAlrNode` and `PlainStrContentAlrNode` subclass because not clear what members that `ContentAlrNode` class would have
// The following is mostly just copied or adapted from the FeedbackGiver codebase.

import { DefaultAlrNode } from '$lib/alr-core/index.ts';
import type { AlrNode, AlrContext, AlrSource, AlrNodeInfo } from '$lib/alr-core/index.ts';
import type { Branded } from '$lib/utils.ts';

/**********************************************
 ****************** Data source  **************
 **********************************************/

export const MarkdownSource: AlrSource<string, MarkdownAlrNode> = {
	toAlr(nodeInfo: AlrNodeInfo, s: string): MarkdownAlrNode {
		return new MarkdownAlrNode(nodeInfo, toMarkdown(s));
	}
};

export const PlainStrContentSource: AlrSource<string, PlainStrContentAlrNode> = {
  toAlr(nodeInfo: AlrNodeInfo, s: string): PlainStrContentAlrNode {
    return new PlainStrContentAlrNode(nodeInfo, s);
  }
}

/**********************************************
 ****************** Markdown  *****************
 **********************************************/

const MARKDOWN_ALR_NODE_TYPE_NAME = 'MarkdownAlrNode';

export const isMarkdownAlrNode = (x: AlrNode): x is MarkdownAlrNode => {
	return x['$type'] === MARKDOWN_ALR_NODE_TYPE_NAME;
};

export type Markdown = Branded<string, 'Markdown'>;
export const toMarkdown = (s: string) => s as Markdown;

// Note: we do NOT want some kind of render or display method for things like this (or PlainStrContentAlrNode).
export class MarkdownAlrNode extends DefaultAlrNode {
	readonly $type = MARKDOWN_ALR_NODE_TYPE_NAME;
	#content: Markdown;

	constructor(nodeInfo: AlrNodeInfo, content: Markdown) {
	  super(nodeInfo);
		this.#content = content;
	}

	setContent(content: Markdown) {
		this.#content = content;
	}

	getContent(): Markdown {
		return this.#content;
	}

	getChildren(_: AlrContext): Array<AlrNode> {
		return [];
	}

	static empty(nodeInfo: AlrNodeInfo): MarkdownAlrNode {
		return new MarkdownAlrNode(nodeInfo, toMarkdown(''));
	}
}

/**********************************************
 ****************** Plain     *****************
 **********************************************/

const PLAIN_STR_CONTENT_ALR_NODE_TYPE_NAME = 'PlainStrContentAlrNode';

export const isPlainStrContentAlrNode = (x: AlrNode): x is PlainStrContentAlrNode => {
	return x['$type'] === PLAIN_STR_CONTENT_ALR_NODE_TYPE_NAME;
};

export class PlainStrContentAlrNode extends DefaultAlrNode {
	readonly $type = PLAIN_STR_CONTENT_ALR_NODE_TYPE_NAME;
	#content: string;

	constructor(nodeInfo: AlrNodeInfo, content: string) {
	  super(nodeInfo);
		this.#content = content;
	}

	setContent(content: string) {
		this.#content = content;
	}

	getContent(): string {
		return this.#content;
	}

	getChildren(_: AlrContext): Array<AlrNode> {
		return [];
	}

	static empty(nodeInfo: AlrNodeInfo): PlainStrContentAlrNode {
		return new PlainStrContentAlrNode(nodeInfo, '');
	}
}

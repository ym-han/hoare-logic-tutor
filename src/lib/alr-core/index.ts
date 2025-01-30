// Top-level ALR
export type { Unsubscriber } from './internal/core.ts';

export { AlrContext, Alr, AlrRootType, DefaultAlrNode, type AlrNodeInfo, NodeInfoManager } from './internal/core.ts';
// export { alrToJson } from "./displayers/display-json.ts";

// ALR data source
export type { AlrSource } from './internal/core.ts';

// ALR ID
export { AlrId } from './internal/id.ts';

// ALR nodes
export type { AlrNode, ExerciseAlrNode, AlrNodeInfoWithoutContext } from './internal/core.ts';
export { ContainerAlrNode } from './container.ts';

// ALR Displayers
export type { DisplayerInfo, AlrDisplayer, DisplayerProps, RootDisplayerProps } from './internal/core.ts';
export { setAlrInSvelteContext, getAlrFromSvelteContext } from './internal/core.ts';

// Content ALR node
export { type Markdown,
  toMarkdown, MarkdownAlrNode,
  isMarkdownAlrNode, MarkdownSource,
  PlainStrContentSource, PlainStrContentAlrNode, isPlainStrContentAlrNode  } from './content.ts';

// Feedback ALR node
export * from './feedback/alr-feedback.ts';

import CodeMirror from './code-mirror.svelte';

export * from '@codemirror/view';
export * from '@codemirror/state';

export { CodeMirror };
export { CodeMirrorCore, makeCodeMirrorKeyBinding } from './code-mirror-operations.svelte.ts';

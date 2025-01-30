<!-- Svelte wrapper component for CodeMirror
Oct 10: JK seems fine with my using this component, at least for now
------------------------------------
Other examples of Svelte CM wrappers
------------------------------------

Less minimal:
* https://github.com/PuruVJ/neocodemirror (in particular https://github.com/PuruVJ/neocodemirror/blob/main/packages/svelte/src/index.ts)
    * codemirror as Svelte *action*
    * this is worth studying, tho may not want to use it just yet
    * Puru, Feb 17 2024:
        "NeoCM lazy loads things, so it can definitely ensure lesser bundle sizes.
        "I myself wouldn't recommend it just yet. Theres a reason its still on 0.0.17 version, im not confident enough yet to graduate to minor yet and there will be breaking changes for sure"
    * can see how they're embedding this within a larger app at
        https://github.com/sveltejs/svelte/blob/2c93c255f0c1a2076326407f2bf976bf3f8da944/sites/svelte-5-preview/src/lib/CodeMirror.svelte
        https://github.com/sveltejs/svelte/blob/2c93c255f0c1a2076326407f2bf976bf3f8da944/sites/svelte-5-preview/src/lib/Output/Output.svelte#L4
* https://github.com/touchifyapp/svelte-codemirror-editor/blob/main/src/lib/CodeMirror.svelte
    * note: https://github.com/touchifyapp/svelte-codemirror-editor/pull/31
* https://github.com/mtmeyer/codemirror-svelte-modules/blob/main/src/lib/CodeMirror.svelte

More minimal:
* https://github.com/NaokiM03/codemirror-svelte/blob/main/src/lib/Codemirror.svelte
* https://github.com/raguay/EmailIt/blob/2cb95a18bde501af8c3a4be1aa46208440a44b79/frontend/src/components/CodeMirror.svelte

-----------------------------
  Misc architectural decisions
------------------------------

* Am wrapping the CM instance(s) in a component, as opposed to action (https://svelte.dev/docs/svelte-action), because
    * Can't do the `cm = cmWrapper.getRef()` ref-from-initialization thing with an action
    * apparently "integrating a UI library as a component opens up the possibility of passing additional content into the UI component library through slots" (Real World Svelte p.94)
      * which we might need to let consumers pass in arbitrary decoration widgets
    * Puru: "Action comes with some downfalls, like manual invalidation of new props vs old ones, in component that problem isn't there"
-->
<svelte:options runes={true} />

<script lang="ts" module>
	import { CodeMirrorCore } from './code-mirror-operations.svelte.ts';
	import { keymap } from '@codemirror/view';
	import { type Extension } from '@codemirror/state';
	import { useDebounce } from 'runed';

	/*******************************
      Props types
  ********************************/

	interface CodeMirrorProps {
		initialInput?: string;
		otherExtensions?: Extension[]; // use this to pass in a custom theme
		// dispatchFunction?: (trs: readonly Transaction[], view: EditorView) => void;
		onInput?: (newDoc: string) => void;
	}

	/*******************************
      Constants
  ********************************/

	const DEFAULT_INITIAL_DOC = '';
	const EDITOR_INPUT_DEBOUNCE_MS = 150;
</script>

<script lang="ts">
	import { EditorView, ViewUpdate, drawSelection, highlightSpecialChars, highlightActiveLine } from '@codemirror/view';
	import { EditorState, Compartment } from '@codemirror/state';
	import {
		defaultHighlightStyle,
		syntaxHighlighting,
		// indentOnInput,
		bracketMatching,
		// foldGutter,
		foldKeymap
	} from '@codemirror/language';
	import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
	import { searchKeymap } from '@codemirror/search';
	import { completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';

	import { onMount, onDestroy } from 'svelte';

	/***************************************************
      Props and common references
  ***************************************************/

	let {
		initialInput: initialDoc = DEFAULT_INITIAL_DOC,
		otherExtensions: otherExtensions = [],
		onInput
	}: CodeMirrorProps = $props();

	const shouldBeReadOnly = new Compartment();

	/***************************************************
      Getting reference to CM Core
  ***************************************************/

	/* eslint-disable-next-line `editorElt` does NOT to be reactive / a $state, since it should not be updated past the first initialization */
	let editorElement: HTMLDivElement;
	let cmCore: CodeMirrorCore;

	// Note: this function definition has to be here, and not in the script with the module attribute above
	export function getRef() {
		return cmCore;
	}

	/***************************************************
      onMount, onDestroy
  ***************************************************/

	function doOnMount(): void {
		const view: EditorView = createEditorView();
		if (editorElement) {
			cmCore = new CodeMirrorCore(initialDoc, editorElement, view, shouldBeReadOnly);
		}
	}

	onMount(doOnMount);
	onDestroy(() => {
		if (cmCore) {
			const editorView = cmCore.getEditorView();
			if (editorView) {
				editorView.destroy();
			}
		}
	});

	/***************************************************
     Setup -- make CM editor view
  ****************************************************/

	function createEditorView(): EditorView {
		return new EditorView({
			doc: initialDoc,
			extensions: setupExtensions(),
			parent: editorElement
			// dispatchTransactions: dispatchFunction
		});
	}

	/***************************************************
     Setup -- extensions; on CM view change callback
  ****************************************************/

	function setupExtensions(): Extension[] {
		const changeWatcher = EditorView.updateListener.of(
			// do not eta-reduce, on pain of sychronization issues
			(view_update) => useDebounce(onViewChange, EDITOR_INPUT_DEBOUNCE_MS)(view_update)
		);

		const extensions: Extension[] = [...coreExtensions, changeWatcher, ...otherExtensions];
		return extensions;
	}

	// TODO: Could separate these into smaller groups of extensions
	/** The most important of the 'base' extensions */
	const coreExtensions: Extension[] = [
		shouldBeReadOnly.of(EditorState.readOnly.of(false)),
		EditorView.lineWrapping,

		history(),
		bracketMatching(),
		closeBrackets(),
		highlightActiveLine(),
		EditorState.allowMultipleSelections.of(false),
		drawSelection(),
		highlightSpecialChars(),
		syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
		keymap.of([
			...closeBracketsKeymap,
			...defaultKeymap,
			...searchKeymap,
			...historyKeymap,
			...foldKeymap,
			...completionKeymap
		])
	];

	function onViewChange(viewUpdate: ViewUpdate): void {
		// TODO: May want to do other kinds of updates
		if (viewUpdate.docChanged) {
			const newDoc = viewUpdate.state.doc.toString();
			cmCore.setDoc(newDoc);

			if (onInput) onInput(newDoc);
		}
	}
</script>

<!-- TODO: Think more about whether the way I'm modifying CM styles in app.css is good enough -->
<div bind:this={editorElement}></div>

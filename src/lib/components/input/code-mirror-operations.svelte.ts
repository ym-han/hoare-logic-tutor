// .svelte.ts and not .ts because CodeMirrorCore uses runes

import { type Command, keymap } from '@codemirror/view';
import { type Extension, Prec, Compartment, EditorState } from '@codemirror/state';
import {
  EditorView
} from '@codemirror/view';

/*******************************
    CodeMirrorCore
*******************************/

/** I think it's OK for callers of this class to have to understand what, e.g., a CM EditorView is,
 *  given how this is a relatively low-level component / a simple wrapper over CM.
 *  After all, any consumer of CM will need to understand what a CM EditorView is to do anything non-trivial.
 */
export class CodeMirrorCore {
  #doc: string = $state()!;

  // need these refs, but don't need $state since refs won't change after initialization
  #view: EditorView;
  #editorElement: HTMLDivElement;
  #compartmentForReadOnly: Compartment;

  constructor(initialDoc: string, editorElement: HTMLDivElement, view: EditorView, shouldBeReadOnly: Compartment) {
    this.#doc = initialDoc;
    this.#editorElement = editorElement;
    this.#view = view;
    this.#compartmentForReadOnly = shouldBeReadOnly;
  }

  /** Returns the doc / input as a signal. */
  get$Doc() {
    return this.#doc;
  }

  setDoc(newDoc: string) {
    this.#doc = newDoc;
  }

  shouldBeReadOnly() {
    return this.getEditorView().state.readOnly;
  }

  makeReadOnly() {
    this.getEditorView().dispatch({
      effects: this.#compartmentForReadOnly.reconfigure(EditorState.readOnly.of(true))
    });
  }

  makeEditable() {
    this.getEditorView().dispatch({
      effects: this.#compartmentForReadOnly.reconfigure(EditorState.readOnly.of(false))
    });
  }

  getEditorView() {
    return this.#view;
  }

  /** Returns the container element */
  getEditorElement() {
    return this.#editorElement;
  }
}

/** Helper function for making key binding extension for CodeMirror */
export function makeCodeMirrorKeyBinding(keyBinding: string, commandToRun: Command): Extension {
  return Prec.highest(
    keymap.of([
      {
        key: keyBinding,
        // TODO-IMPT: figure out why 'Mod/Meta-Enter' does not work for me (Chrome, mac)
        run: commandToRun,
        preventDefault: true
      }
    ])
  );
}

import { type EditorView } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { linter } from '@codemirror/lint';
import type { Diagnostic } from '@codemirror/lint';

// from https://discuss.codemirror.net/t/show-syntax-error-from-lezer-parse/5346
// https://discuss.codemirror.net/t/showing-syntax-errors/3111/6
// TODO: improve this!

export function basicLezerLintSource(view: EditorView): readonly Diagnostic[] {
	const diagnostics: Diagnostic[] = [];

	syntaxTree(view.state).iterate({
		enter: (node) => {
			if (node.type.isError) {
				diagnostics.push({
					from: node.from,
					to: node.to,
					severity: 'error',
					message: 'Syntax error!'
				});
			}
		}
	});

	return diagnostics;
}

export async function getLinterErrors(
	diagnostics: readonly Diagnostic[] | Promise<readonly Diagnostic[]>
) {
	const diags = await diagnostics;
	return diags.filter((d) => d.severity === 'error');
}

export function basicLezerLinter() {
	return linter(basicLezerLintSource);
}

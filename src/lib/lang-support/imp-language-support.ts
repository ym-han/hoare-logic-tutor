/* CodeMirror Lang support for HL assertions */
import { parser } from '$lib/lang-support/lezer-imp/lezer-imp.js';
import {
	LRLanguage,
	LanguageSupport,
	indentNodeProp,
	foldNodeProp,
	foldInside,
	delimitedIndent
} from '@codemirror/language';
import { styleTags, tags as t } from '@lezer/highlight';

import { completeFromList } from '@codemirror/autocomplete';

export const COMMAND_DELIMITER = ';';

// TODO: Add docstrings / section headers

export const impLanguage = LRLanguage.define({
	parser: parser.configure({
		props: [
			indentNodeProp.add({
				Application: delimitedIndent({ closing: ')', align: false })
			}),
			foldNodeProp.add({
				Application: foldInside
			}),
			styleTags({
				Identifier: t.variableName,
				// LitBool: t.bool,
				LineComment: t.lineComment,
				'( )': t.paren
			})
		]
	}),
	languageData: {
		commentTokens: { line: '#' }
	}
});

export const simpleCompletion = impLanguage.data.of({
	autocomplete: completeFromList([
		{ label: 'true', type: 'constant' },
		{ label: 'false', type: 'constant' },
		{ label: 'implies', apply: '=>', type: 'operator' },
		{ label: '=', type: 'operator' },
		{ label: '!=', type: 'operator' },
		{ label: '=>', type: 'operator' },

		{ label: '&&', type: 'operator' },
		{ label: '||', type: 'operator' }
	])
});

export function getImpLanguageSupport(): LanguageSupport {
	return new LanguageSupport(impLanguage, [simpleCompletion]);
}

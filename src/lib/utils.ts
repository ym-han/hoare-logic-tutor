import { unmount } from 'svelte';
import type { Properties as CSSProperties } from 'csstype';
import { match } from 'ts-pattern';
import {CodeMirror} from "$lib/components/input/index.ts";

/** This apparently is also in the package `ts-essentials` --- could use that package if we end up using more stuff from it.
 * See also https://stackoverflow.com/questions/39419170/how-do-i-check-that-a-switch-block-is-exhaustive-in-typescript */
export class UnreachableCaseError extends Error {
  constructor(val: never) {
    super(`Unreachable case: ${JSON.stringify(val)}`);
  }
}

/*******************************************
****** Result (aka Either) type ************
********************************************/

/** aka Either */
export type Result<T, E> = { type: 'success'; value: T }
                         | { type: 'failure'; error: E };

export function makeSuccessResult<T>(value: T) {
  return {type: 'success' as const, value };
}

export function makeFailure<E>(error: E) {
  return {type: 'failure' as const, error};
}

export function isSuccessResult<T, E>(result: Result<T, E>) {
  return result.type === 'success';
}

export function isFailureResult<T, E>(result: Result<T, E>) {
  return result.type === 'failure';
}

/********************************************
**** Optional type and helper functions *****
*********************************************/

/** aka Maybe */
export type Optional<T> = { type: 'success'; value: T }
                        | { type: 'failure' };

export function isSuccess<T>(result: Optional<T>) {
  return result.type === 'success';
}

export function isFailure<T>(result: Optional<T>) {
  return result.type === 'failure';
}

export function makeJust<T>(value: T): Optional<T> {
  return { type: 'success' as const, value};
}

export function makeNothing<T>(): Optional<T> {
  return { type: 'failure' as const };
}

/** Returns a function that's the moral equivalent of `<|>` in
 *
 * ```haskell
 * instance Alternative Maybe where
    empty = Nothing
    Just a  <|> _ = Just a
    Nothing <|> b = b
 * ```
 */
export function liftToOptional<T>(op: (result1: T, result2: T) => T): (mr1: Optional<T>, mr2: Optional<T>) => Optional<T> {
  return (mr1: Optional<T>, mr2: Optional<T>) => {
    return match([mr1, mr2])
            .with(
              [{ type: 'success' }, { type: 'success' }],
              ([{value: r1}, {value: r2}]) => makeJust(op(r1, r2))
              )
            .otherwise(() => makeNothing());
  }
}

/**************************************************************
****** Other useful type related things and combinators *******
***************************************************************/

export type ValueOf<Obj> = Obj[keyof Obj];

// https://stackoverflow.com/questions/52703321/make-some-properties-optional-in-a-typescript-type
export type RequiredExceptFor<T, TOptional extends keyof T> = Pick<T, Diff<keyof T, TOptional>> &
  Partial<T>;
type Diff<T, U> = T extends U ? never : T;


/* ====== Branded types ============ */

/** https://egghead.io/blog/using-branded-types-in-typescript
 *  See also the TS playground excerpt linked from the article above
 */
declare const __brand: unique symbol;
type Brand<B> = { [__brand]: B };
export type Branded<T, B> = T & Brand<B>;


/* ====== CSS ============ */

export type CSSClass = string;

export type Styles = {
  [val: string]: CSSProperties | Styles;
};

/**********************************************
**** Other utility type related functions *****
***********************************************/

export function nonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

/* ====== CM-related utils ============ */

export function cleanupBaseCodeMirrorWrapper(baseCMWrapper: CodeMirror) {
  if (baseCMWrapper && baseCMWrapper.getRef() && baseCMWrapper.getRef().getEditorView())
    unmount(baseCMWrapper);
}

/**********************************************
*********** Misc util functions ***************
***********************************************/


/* ====== String processing utils ============ */

export function toUpperSnakeCase(input: string): string {
  return input
    .replace(/([a-z])([A-Z])/g, '$1_$2') // Insert underscore between lowercase and uppercase letters
    .toUpperCase();
}


// Oct 2024: The following is not currently needed.
// TODO: Remove altogether if we don't end up needing them at all in the foreseeable future

/* ----- HTML related ------ */

// create table from data with attributes in the first row
// export function makeTableFromDict(dict: Record<string, string>): HTMLTableElement {
// 	const table = document.createElement('table');
// 	const thead = document.createElement('thead');
// 	const tbody = document.createElement('tbody');

// 	// Create header row with attribute names
// 	const headerRow = thead.insertRow();
// 	for (const key in dict) {
// 		if (Object.hasOwn(dict, key)) {
// 			const cell = document.createElement('th');
// 			cell.textContent = key;
// 			headerRow.appendChild(cell);
// 		}
// 	}
// 	table.appendChild(thead);

// 	// Populate table body with dict values
// 	const row = tbody.insertRow();
// 	for (const key in dict) {
// 		if (Object.hasOwn(dict, key)) {
// 			const cell = row.insertCell();
// 			cell.textContent = dict[key];
// 		}
// 	}

// 	table.appendChild(tbody);
// 	console.log(table);
// 	return table;
// }

import { describe, it, expect } from 'vitest';
import { parseToAssertion, parseToCommand, RefineLezerParseError } from '../lib/lang-support/index.ts';
import {
  type Name, Var, NumLit, BoolLit, Not, And, Or,
  Implies, Eq, Gt,
  PredicateApp,
  Assign,
} from '../lib/lang-support/index.ts';

/************************
    Commands
*************************/

describe('Basic commands', () => {
  it('Assignment: var, rhs, substitution', () => {
    const assignment = parseToCommand('x := 1 - 3') as Assign;
    expect(assignment.getVar().subst(new Var('x' as Name), new NumLit(1337)).toString()).toBe('1337');
    expect(assignment.getRhs().toString().replace(/[()]/g, '').trim()).toBe('1 - 3');
  });

  it('Commands: `parseToCommand` adds trailing semicolon if not present', () => {
    const assignment = parseToCommand('x := -1 / 2 + 3') as Assign;
    expect(assignment.getOriginalInput()).toBe('x := -1 / 2 + 3;');
  });

  it('Assignment: Pretty printing prints with trailing semicolon', () => {
    const assignment = parseToCommand('zz := 7');
    expect(assignment.toString()).toBe('zz := 7;');
  });

  it('Skip basic', () => {
    expect(parseToCommand("skip ;").toString()).toBe('skip;');
  })
})

/************************
    Formulas
*************************/

describe('Basic formulas', () => {

  it('Boolean literals', () => {

    expect((parseToAssertion('{false}').getFormula() as BoolLit).value).toBe(false);
    expect((parseToAssertion('{true}').getFormula() as BoolLit).value).toBe(true);
  });


  it('Negated formulas', () => {
    const negatedFalseFormula = parseToAssertion('{!false}').getFormula();
    expect((negatedFalseFormula as Not).getNegand()).toEqual(parseToAssertion('{false}').getFormula());

    const negatedTrueFormula = parseToAssertion('{!true}').getFormula();
    expect((negatedTrueFormula as Not).getNegand()).toEqual(parseToAssertion('{true}').getFormula());
  });
});

describe('Substitution', () => {
  it('Substitution in complex formula', () => {
    const formula = parseToAssertion('{ x > 5 && y = x - 1 / (x * 3) }').getFormula();
    const substituted = formula.subst(new Var('x' as Name), new NumLit(1337));
    expect(substituted.toString()).toBe('((1337 > 5) && (y = (1337 - (1 / (1337 * 3)))))');
  });
})

describe('Binary operators', () => {
  it('Basic conjunction', () => {
    const formula = parseToAssertion('{true && false}').getFormula();
    const conjFormula = formula as And;
    expect(conjFormula.getLeft()).toEqual(parseToAssertion('{true}').getFormula());
    expect(conjFormula.getRight()).toEqual(parseToAssertion('{false}').getFormula());
  });

  it('Basic disjunction', () => {
    const formula = parseToAssertion('{true || false}').getFormula();
    const disjFormula = formula as Or;
    expect(disjFormula.getLeft()).toEqual(parseToAssertion('{true}').getFormula());
    expect(disjFormula.getRight()).toEqual(parseToAssertion('{false}').getFormula());
  });

  it('Basic implication', () => {
    const formula = parseToAssertion('{true => false}').getFormula();
    const implFormula = formula as Implies;
    expect(implFormula.getLeft()).toEqual(parseToAssertion('{true}').getFormula());
    expect(implFormula.getRight()).toEqual(parseToAssertion('{false}').getFormula());
  });


  it('Left-associative conjunction', () => {
    expect(parseToAssertion('{ true && !false && !!true }').getFormula().toString()).toEqual('((true && !false) && !!true)');
  });

  it('Left-associative disjunction', () => {
    expect(parseToAssertion('{ true || !false || !!true }').getFormula().toString()).toEqual('((true || !false) || !!true)');
  });

  /* Operator precedence */

  it('Preserves operator precedence through roundtrip', () => {
    const expr = '{ x = 12 * y + 1 }';
    expect(parseToAssertion(expr).toString()).toBe(parseToAssertion(parseToAssertion(expr).toString()).toString());
  });

  it('Operator precedence: Simple comparison op with conjunction', () => {
    const formula = parseToAssertion('{ y = 1 && x > 1}').getFormula() as And;
    const eqFormula = formula.getLeft() as Eq;
    const gtFormula = formula.getRight() as Gt;

    expect(eqFormula).toEqual(parseToAssertion('{ y = 1 }').getFormula());
    expect(gtFormula).toEqual(parseToAssertion('{ x > 1 }').getFormula());
  });
});


describe('Predicates', () => {
  it('rejects non-integer arguments', () => {
    expect(() => parseToAssertion('{ pred(x, 2, true) }')).toThrow(RefineLezerParseError);
  });

  it('integer-expression arguments are valid', () => {
    const formula = parseToAssertion('{ pred(x, 2, y + 1) }').getFormula() as PredicateApp;
    expect(formula.getPredicateName()).toBe('pred');
    expect(formula.getArgs()).toHaveLength(3);
  });
});

/*******************
  Expected errors
********************/

describe('Invalid input', () => {
  const invalidCases = [
    '{   }',
    '{ () }',
    '{ x }',
    '{ x yyyyy z }',
    '{a || b || c}', // We currently expect variables to have integers as their values

    // type mismatches
    '{ true + 1 }',
    '{ false * false  } ',
    '{ 2 => true }',
    '{ true && -1 }'
  ];

  it.each(invalidCases)('rejects invalid input: %s', (input) => {
    expect(() => parseToAssertion(input)).toThrow(RefineLezerParseError);
  });
});

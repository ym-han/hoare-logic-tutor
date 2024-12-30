import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { parseToAssertion, parseToCommand, HoareTriple } from '../lib/lang-support/index.ts';
import {
  type Z3Env,
  killThreads,
  z3ProveConjecture
} from '../lib/lang-support/index.ts';
import { init } from 'z3-solver';
import * as Z3 from 'z3-solver';
import {checkHoareTriple} from '$lib/hoare-logic-specific/answer-checker.ts';

let api: Awaited<ReturnType<typeof init>>;
let z3env: Z3Env;

beforeAll(async () => {
  api = await init();
  z3env = { api, z3context:  api.Context('main') };
})


afterAll(async () => {
  await killThreads(api.em);
});

describe('Imp Assertion to Z3 translation', () => {

  it('Boolean literals', async () => {
    // Test true
    const trueFormula = parseToAssertion('{true}').toZ3(z3env) as Z3.Bool;
    const solver = new z3env.z3context.Solver();
    solver.add(trueFormula);
    expect(await solver.check()).toStrictEqual('sat');

    // Test false
    const falseFormula = parseToAssertion('{false}').toZ3(z3env) as Z3.Bool;
    expect(await z3env.z3context.solve(falseFormula)).toBe('unsat');
  });

  it('Arithmetic comparisons', async () => {
    const comparison1 = parseToAssertion('{ 2 > 1 }').toZ3(z3env) as Z3.Bool;
    const solver = new z3env.z3context.Solver();
    solver.add(comparison1);
    expect(await solver.check()).toStrictEqual('sat');

    const comparison2_unsat = parseToAssertion('{ 1 = 2 }').toZ3(z3env) as Z3.Bool;
    expect(await z3env.z3context.solve(comparison2_unsat)).toBe('unsat');

    const comparison3 = parseToAssertion('{ 1 >= 2 }').toZ3(z3env) as Z3.Bool;
    expect(await z3env.z3context.solve(comparison3)).toBe('unsat');

    const comparison4 = parseToAssertion('{ 1 >= 2 - 1 }').toZ3(z3env) as Z3.Bool;
    expect(await z3env.z3context.solve(z3env.z3context.Not(comparison4))).toBe('unsat');

  });

  it('Logical operators', async () => {
    // { true && false } is unsat
    expect(await z3env.z3context.solve(
      parseToAssertion('{ true && false }').toZ3(z3env) as Z3.Bool)).toBe('unsat');

    // Test disjunction
    const orFormula = parseToAssertion('{ true || false }').toZ3(z3env);
    expect(await z3env.z3context.solve(z3env.z3context.Not(orFormula))).toBe('unsat');
  });

  it('Implication', async () => {
    // p => p should be valid (true in all interpretations)
    const implFormula = parseToAssertion('{ x > 0 => x > 0 }').toZ3(z3env);
    expect(await z3env.z3context.solve(z3env.z3context.Not(implFormula))).toBe('unsat');
  });

  it('Variables and arithmetic expressions', async () => {
    const solver = new z3env.z3context.Solver();

    // x = y + 1 should be satisfiable
    const formula = parseToAssertion('{ x = y + 1 }').toZ3(z3env);
    solver.add(formula);
    expect(await solver.check()).toBe('sat');
  });

  it('Equivalent predicates 1', async () => {
    const formula1 = parseToAssertion('{ f(x) => g(x + 1) }').toZ3(z3env);
    const formula2 = parseToAssertion('{ !f(x) || g(x + 1) }').toZ3(z3env);
    const equivalence = formula1.eq(formula2);
    expect(await z3env.z3context.solve(z3env.z3context.Not(equivalence))).toBe('unsat');
  });

  it('Equivalent predicates 2', async () => {
    const formula1 = parseToAssertion('{ f(x) && g(x / 1) }').toZ3(z3env);
    const formula2 = parseToAssertion('{ g(x / 1) && f(x) }').toZ3(z3env);
    const equivalence = formula1.eq(formula2);
    expect(await z3env.z3context.solve(z3env.z3context.Not(equivalence))).toBe('unsat');
  });

  it('Equivalent 3 - really a test of parsing operator precedence', async () => {
    const formula1 = parseToAssertion('{ ( a <= 0 => m = 2) && ( ( a > 0) => m = 3)}').toZ3(z3env);
    const formula2 = parseToAssertion('{ ( (a <= 0) => m = 2) && ( a > 0 => m = 3)}').toZ3(z3env);
    const equivalence = formula1.eq(formula2);
    expect(await z3env.z3context.solve(z3env.z3context.Not(equivalence))).toBe('unsat');
  });

  it('More tautologies', async () => {
    const tautology1 = parseToAssertion('{ x + 1 > x }').toZ3(z3env);
    expect(await z3env.z3context.solve(z3env.z3context.Not(tautology1))).toBe('unsat');

    const tautology2 = parseToAssertion('{ f(y, x - 1) => f(y, x - 1) }').toZ3(z3env);
    expect(await z3env.z3context.solve(z3env.z3context.Not(tautology2))).toBe('unsat');

    const tautology3 = parseToAssertion('{ f(y, x - 1) && g(z) => f(y, x +2 - 3) }').toZ3(z3env);
    expect(await z3env.z3context.solve(z3env.z3context.Not(tautology3))).toBe('unsat');
  });
});

/***********************************
   Stuff adapted from HLT exercises
*************************************/

describe('Adapted from HLT exercises', () => {
  it('Adapted from HLT unit examples 1 - eq', async () => {
    const formula1 = parseToAssertion('{ (2 - a) * 2 + 1 = 5 }').toZ3(z3env);
    const formula2 = parseToAssertion('{ a = 0 }').toZ3(z3env);
    const equivalence = formula1.eq(formula2);
    expect(await z3env.z3context.solve(z3env.z3context.Not(equivalence))).toBe('unsat');
  });

  it('Adapted from HLT unit examples 2 - eq', async () => {
    const formula1 = parseToAssertion('{ p(x) => (q(x) || r(x)) }').toZ3(z3env);
    const formula2 = parseToAssertion('{ q(x) || ( p(x) => r(x) ) }').toZ3(z3env);
    const equivalence = formula1.eq(formula2);
    expect(await z3env.z3context.solve(z3env.z3context.Not(equivalence))).toBe('unsat');
  });

  it('Adapted from HLT unit. Not equiv.', async () => {
    const solver = new z3env.z3context.Solver();

    // Not equiv
    const formula1 = parseToAssertion('{ b > 0 && ( (a <= 0) => x = 8*b + 1) && ( (a > 0) => x = 12*b + 1) }').toZ3(z3env);
    const formula2 = parseToAssertion('{ ( (a <= 0) => x = 8*b + 1) && ( (a > 0) => x = 12*b + 1) }').toZ3(z3env);
    const conjecture = formula1.eq(formula2);
    solver.add(z3env.z3context.Not(conjecture));
    expect(await solver.check()).toStrictEqual('sat');
  });

  it('Adapted from HLT unit. Not equiv -- example of mistake we would like to catch', async () => {
    const solver = new z3env.z3context.Solver();

    // Not equiv
    const formula1 = parseToAssertion('{ ( odd(x) => x - y = 1 ) && ( even(x) => x - y = 0 ) }').toZ3(z3env);
    const formula2 = parseToAssertion('{ odd(x) => x - y = 1 && ( even(x) => x - y = 0 ) }').toZ3(z3env);
    const conjecture = formula1.eq(formula2);
    solver.add(z3env.z3context.Not(conjecture));
    expect(await solver.check()).toStrictEqual('sat');
  });


  it('Adapted from HLT EG 2', async () => {
    const solver = new z3env.z3context.Solver();

    // Not equiv, but not caught as such, presumably because of integer division issues?

    const formula1 = parseToAssertion('{ (2 * (2 - a)) = 1 }').toZ3(z3env);
    const formula2 = parseToAssertion('{ a = 0 }').toZ3(z3env);
    const conjecture1 = formula1.implies(formula2);
    solver.add(z3env.z3context.Not(conjecture1));
    expect(await solver.check()).toStrictEqual('unsat');

    // This shows that it's not because of a parsing issue on my end
    const a = z3env.z3context.Int.const('a');
    const antecedent = z3env.z3context.Int.val(2).mul(z3env.z3context.Int.val(2).sub(a)).eq(z3env.z3context.Int.val(1));

    const conjecture2 = antecedent.implies(formula2);
    solver.add(z3env.z3context.Not(conjecture2));
    expect(await solver.check()).toStrictEqual('unsat');

  });

  it('Adapted from HLT EG 4', async () => {
    const solver = new z3env.z3context.Solver();

    const antecedent = parseToAssertion("{ b > 0 }")
    const antecedentFormula = antecedent.toZ3(z3env);
    const consequent = parseToAssertion("{ b > 0 && ( a <= 0 => (((2 - (a + 1) / a) / 2) * 2 + (1 - ((2 - (a + 1) / a) / 2)) * 3) = 2 ) && ( a > 0 => (((2 - (a + 1) / a) / 2) * 2 + (1 - ((2 - (a + 1) / a) / 2)) * 3) = 3 ) }");
    const consequentFormula = consequent.toZ3(z3env);
    const conjecture = antecedentFormula.implies(consequentFormula);
    solver.add(z3env.z3context.Not(conjecture));
    const result = await solver.check();
    expect(result).toStrictEqual('unsat');
  });
});

describe('Division semantics', () => {
  // Will be easier to make more robust tests once we add support for quantifiers.

  /******************************
        Division by 0
  *******************************/

  it('x / 0 = 0', async () => {
    const {result} = await z3ProveConjecture(z3env, parseToAssertion('{ 42 / 0 = 0 }').toZ3(z3env));
    expect(result).toBe('unsat');
  });

  it('modulo by zero equals dividend: 42 % 0 = 42', async () => {
    const {result} = await z3ProveConjecture(z3env, parseToAssertion('{ 42 % 0 = 42 }').toZ3(z3env));
    expect(result).toBe('unsat');
  });

  /******************************
       Rounding down to 0
  *******************************/

  it('positive / positive division rounds down: 7/3 = 2', async () => {
    const {result} = await z3ProveConjecture(z3env, parseToAssertion('{ 7 / 3 = 2 }').toZ3(z3env));
    expect(result).toBe('unsat');
  });

  it('negative / positive division: -7/3 = -2', async () => {
    const {result} = await z3ProveConjecture(z3env, parseToAssertion('{ -7 / 3 = -2 }').toZ3(z3env));
    expect(result).toBe('unsat');
  });

  it('positive / negative division: 7/-3 = -2', async () => {
    const {result} = await z3ProveConjecture(z3env, parseToAssertion('{ 7 / -3 = -2 }').toZ3(z3env));
    expect(result).toBe('unsat');
  });

  it('negative / negative division: -7/-3 = 2', async () => {
    const {result} = await z3ProveConjecture(z3env, parseToAssertion('{ -7 / -3 = 2 }').toZ3(z3env));
    expect(result).toBe('unsat');
  });

  it('negative/negative integer division rounds to 0: (-2 + 1) / -2 = 0', async () => {
    const {result} = await z3ProveConjecture(z3env, parseToAssertion('{ (-2 + 1) / -2 = 0 }').toZ3(z3env));
    expect(result).toBe('unsat');
  });

  it('positive modulo: 7 % 3 = 1', async () => {
    const {result} = await z3ProveConjecture(z3env, parseToAssertion('{ 7 % 3 = 1 }').toZ3(z3env));
    expect(result).toBe('unsat');
  });

  it('negative modulo: -7 % 3 = -1', async () => {
    const {result} = await z3ProveConjecture(z3env, parseToAssertion('{ -7 % 3 = -1 }').toZ3(z3env));
    expect(result).toBe('unsat');
  });
});

/***************************
    checkHoareTriple
****************************/

describe('checkHoareTriple with edge case triples', () => {
  it('Vacuous precond 1: {false} S {true}', async() => {
    const { result } = await checkHoareTriple(z3env,
      new HoareTriple(parseToAssertion("{ false} "),
                      parseToCommand("x := 99999999999 "),
                      parseToAssertion("{ true }")));
    expect(result).toStrictEqual('unsat');
  });

  it('Vacuous precond 2: {false} skip {false}', async () => {
    const triple = new HoareTriple(
      parseToAssertion('{ false }'),
      parseToCommand('skip;'),
      parseToAssertion('{ false }')
    );
    const { result } = await checkHoareTriple(z3env, triple);
    expect(result).toBe('unsat');
  });

  it('True implies true: {true} skip {true}', async () => {
    const triple = new HoareTriple(
      parseToAssertion('{ true }'),
      parseToCommand('skip;'),
      parseToAssertion('{ true }')
    );
    const { result } = await checkHoareTriple(z3env, triple);
    expect(result).toBe('unsat');
  });

  it('{true} x := 9999 <or any other terminating cmd> {false} is not a valid h triple', async () => {
    const triple = new HoareTriple(
      parseToAssertion('{ true }'),
      parseToCommand('x := 9999'),
      parseToAssertion('{ false }')
    );
    const { result } = await checkHoareTriple(z3env, triple);
    expect(result).toBe('sat');
  });
});

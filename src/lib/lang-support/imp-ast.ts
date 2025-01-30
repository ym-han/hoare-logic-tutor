import { type Branded } from '$lib/utils.ts';
import { match } from 'ts-pattern';
import * as Z3 from 'z3-solver';
import type { Z3Env } from './index.ts';
import { COMMAND_DELIMITER } from './index.ts';

/*******************
    Hoare Triple
********************/

/** Used for answer checking
 * but NOT currently used when parsing from concrete to abstract syntax.
 */
export class HoareTriple {
  constructor(
    private readonly pre: Assertion,
    private readonly command: Command,
    private readonly post: Assertion) {
  }

  getPre() {
    return this.pre;
  }

  getPost() {
    return this.post;
  }

  getCommand() {
    return this.command;
  }
}


/*********************
      Parser Info
**********************/

// See https://github.com/Z3Prover/z3/blob/master/src/api/js/src/high-level/high-level.test.ts
// and https://microsoft.github.io/z3guide/programming/Z3%20JavaScript%20Examples
// for examples of Z3 usage

export interface ParserInfo {
  /** More precisely, a trimmed version thereof */
  originalInput: string;
}


/********************
        Decl
*********************/

/** A 'declaration' type. */
export type Decl = Assertion | Command;

abstract class BaseDecl {
  abstract toString(): string;

  /** NOTE: Current implementation won't work once we add quantifiers. */
  isEqualTo<T extends BaseDecl>(other: T) {
    // TODO: Will need something more sophisticated when we add quantifiers
    return this.toString() === other.toString();
  }
}

abstract class BaseToplevelDecl extends BaseDecl {
  protected parserInfo: ParserInfo;

  constructor(parserInfo: ParserInfo) {
    super();
    this.parserInfo = parserInfo;
  }

  getOriginalInput(): string {
    return this.parserInfo.originalInput;
  }
}

/********************
      Command
*********************/

/** Imp Command or Statement */
export type Command = Assign | Skip;
// | Sequence;

export function isCommand(obj: any) {
  return obj instanceof Assign || obj instanceof Sequence || obj instanceof Skip;
}

export class Skip extends BaseToplevelDecl {
  constructor(parserInfo: ParserInfo) { super(parserInfo) }

  getSubCommands() {
    return [];
  }

  toString() {
    return "skip;"
  }
}


export class Assign extends BaseToplevelDecl {
  constructor(parserInfo: ParserInfo, private readonly variable: Var, private readonly rhs: ArithExpr) {
    super(parserInfo);
  }

  getVar() {
    return this.variable;
  }

  getRhs() {
    return this.rhs;
  }

  getSubCommands() {
    return [];
  }

  toString() {
    return `${this.variable.toString()} := ${this.rhs}${COMMAND_DELIMITER}`;
  }
}

/** Invariant: At least two commands */
export class Sequence extends BaseToplevelDecl {
  readonly #commands: Command[]
  constructor(parserInfo: ParserInfo, commands: Command[]) {
    super(parserInfo);
    const flattenedCommands = commands.flatMap(c => c.getSubCommands());
    if (flattenedCommands.length < 2) {
      throw new Error('Sequence must be initialized with at least two subcommands');
    }

    this.#commands = flattenedCommands;
  }

  getSubCommands() {
    return this.#commands;
  }

  toString() {
    return this.getSubCommands().join(" ");
  }
}


/********************
        Expr
*********************/

export type Expr = Formula | ArithExpr;

export type Name = Branded<string, 'Name'>;

abstract class BaseExpr {
  /** Whether this expr should be wrapped in parentheses when pretty printing */
  abstract shouldParenthesize(): ShouldParenthesizeStatus;
  /** A helper method: pretty print without considering whether we need parentheses */
  abstract nonParenthesizedToString(): string
  /** Pretty print the expr, accounting also for parentheses */
  toString(): string {
    return match(this.shouldParenthesize())
      .with(ShouldParenthesizeStatus.AddParen, () => `(${this.nonParenthesizedToString()})`)
      .with(ShouldParenthesizeStatus.NoParen, () => this.nonParenthesizedToString())
      .exhaustive();
  }

  /** NOTE: Current implementation won't work once we add quantifiers. */
  isEqualTo<T extends BaseExpr>(other: T) {
    // TODO: Will need something more sophisticated when we add quantifiers
    return this.toString() === other.toString();
  }

  /** Returns an array with the unique free variables */
  getFreeProgramVars(): Var[] {
    return [...new Set(this.getChildren()
                           .flatMap(child => child.getFreeProgramVars()))];
  }

  abstract getChildren(): Expr[];

  abstract map(
    transformFormula: (f: Formula) => Formula,
    transformArith: (a: ArithExpr) => ArithExpr
  ): this;
}

/********************
      Assertion
*********************/

/* TODO: May want to do away with Assertion and just use Formula */
export function isAssertion(obj: any): obj is Assertion {
  return obj instanceof Assertion;
}

export class Assertion extends BaseToplevelDecl {
  #formula: Formula;

  constructor(parserInfo: ParserInfo, formula: Formula) {
    super(parserInfo);
    this.#formula = formula;
  }

  getFormula(): Formula {
    return this.#formula;
  }

  /** This does NOT return the original input, but instead a pretty-printed version of the structured formula */
  toString() {
    return `{ ${this.getFormula().toString()} }`;
  }

  toZ3(z3env: Z3Env) {
    return this.getFormula().toZ3(z3env);
  }

  map(
    transformFormula: (f: Formula) => Formula,
    transformArith: (a: ArithExpr) => ArithExpr
  ): this {
    return new Assertion(this.parserInfo, this.#formula.map(transformFormula, transformArith)) as this;
  }
}

/********************
      Formula
*********************/

export type Formula =
  | BoolLit
  | PredicateApp
  | Not
  | And
  | Or
  | Implies
  | Eq
  | Neq
  | Lt
  | Lte
  | Gt
  | Gte

export function isFormula(obj: any) {
  return obj instanceof BaseFormula;
}

/** This is an abstract class because we'll be adding a getZ3Sort method with a default implementation shortly */
abstract class BaseFormula extends BaseExpr {
  getZ3Sort(z3env: Z3Env) {
    return z3env.z3context.Bool.sort();
  }

  abstract toZ3(z3env: Z3Env): Z3.Bool;

  /** Replace all occurrences of @v@ in this expr with @expr@ */
  abstract subst(v: Var, expr: ArithExpr): Formula;
}

/** Perhaps should call this 'Relation'. */
export class PredicateApp extends BaseFormula {
  readonly #predicateName: Name;
  readonly #args: ArithExpr[];

  constructor(predicateName: Name, args: ArithExpr[]) {
    super();
    this.#predicateName = predicateName;
    this.#args = args;
  }

  getPredicateName() {
    return this.#predicateName;
  }

  getArgs() {
    return this.#args;
  }

  shouldParenthesize() {
    return ShouldParenthesizeStatus.NoParen;
  }

  nonParenthesizedToString() {
    return `${this.getPredicateName()}(${this.getArgs().join(", ")}`;
  }

  toZ3(z3env: Z3Env) {
    const argSorts = this.getArgs().map(arg => arg.getZ3Sort(z3env));
    const returnSort = z3env.z3context.Bool.sort();
    const predicate = z3env.z3context.Function.declare(this.getPredicateName() as string,
      ...argSorts, returnSort);
    return predicate.call(...this.getArgs().map(arg => arg.toZ3(z3env)));
  }

  subst(v: Var, expr: ArithExpr) {
    // TODO: Look more into how best to type this
    return new (this.constructor as new (name: Name, args: ArithExpr[]) => this)(
      this.getPredicateName(),
      this.getArgs().map(arg => arg.subst(v, expr)) as ArithExpr[]
    );
  }

  getChildren(): Expr[] {
    return this.getArgs();
  }

  map(
    _transformFormula: (f: Formula) => Formula,
    transformArith: (a: ArithExpr) => ArithExpr
  ): this {
    return new PredicateApp(
      this.getPredicateName(),
      this.getArgs().map(transformArith) as ArithExpr[]
    ) as this;
  }
}

export class Not extends BaseFormula {
  readonly #negand: Formula;

  constructor(formula: Formula) {
    super();
    this.#negand = formula;
  }

  getNegand() {
    return this.#negand;
  }

  nonParenthesizedToString() {
    return `!${this.getNegand()}`;
  }

  shouldParenthesize() {
    return ShouldParenthesizeStatus.NoParen;
  }

  toZ3(z3env: Z3Env): Z3.Bool {
    return z3env.z3context.Not(this.getNegand().toZ3(z3env) as Z3.Bool);
  }

  subst(v: Var, expr: ArithExpr): Formula {
    return new (this.constructor as new (formula: Formula) => this)(
      this.getNegand().subst(v, expr)
    );
  }

  getChildren(): Expr[] {
    return [this.getNegand()];
  }

  map(
    transformFormula: (f: Formula) => Formula,
    _transformArith: (a: ArithExpr) => ArithExpr
  ): this {
    return new Not(transformFormula(this.getNegand())) as this;
  }
}

export class BoolLit extends BaseFormula {
  readonly #value: boolean;

  constructor(readonly value: boolean) {
    super();
    this.#value = value;
  }

  getValue() {
    return this.#value;
  }

  nonParenthesizedToString() {
    return this.value ? "true" : "false";
  }

  shouldParenthesize() {
    return ShouldParenthesizeStatus.NoParen;
  }

  toZ3(z3env: Z3Env): Z3.Bool {
    return z3env.z3context.Bool.val(this.getValue())
  }

  subst(_v: Var, _expr: ArithExpr) {
    return this;
  }

  getChildren(): Expr[] {
    return [];
  }

  map(
    _transformFormula: (f: Formula) => Formula,
    _transformArith: (a: ArithExpr) => ArithExpr
  ): this {
    return this;
  }

  getFreeProgramVars(): Var[] {
    return [];
  }
}

/********************************
    Binary formula / bool expr
*********************************/

// Might be nicer to use mixins for the binary expr stuff,
// instead of repeating this for formulas and arith exprs
// but let's not worry about that for now.
// And of course another way to unify this is to simplify the grammar
// and not distinguish between binary arith and binary bool exprs.

export abstract class BinFormula<T extends Expr> extends BaseFormula {
  readonly #left: T;
  readonly #right: T;

  constructor(left: T, right: T) {
    super();
    this.#left = left;
    this.#right = right;
  }

  getLeft() {
    return this.#left;
  }

  getRight() {
    return this.#right;
  }

  getChildren(): [T, T] {
    return [this.#left, this.#right];
  }

  shouldParenthesize() {
    // a default simple implementation; can make this more selective in the future
    return ShouldParenthesizeStatus.AddParen;
  }

  subst(v: Var, expr: ArithExpr): Formula {
    return new (this.constructor as new (left: T, right: T) => this)(
      this.getLeft().subst(v, expr) as T,
      this.getRight().subst(v, expr) as T
    ) as Formula;
  }

  map(
    transformFormula: (f: Formula) => Formula,
    transformArith: (a: ArithExpr) => ArithExpr
  ): this {
    // Transform left and right operands based on their type
    const transformedLeft = isFormula(this.getLeft())
      ? transformFormula(this.getLeft() as Formula)
      : transformArith(this.getLeft() as ArithExpr);

    const transformedRight = isFormula(this.getRight())
      ? transformFormula(this.getRight() as Formula)
      : transformArith(this.getRight() as ArithExpr);

    return new (this.constructor as new (left: T, right: T) => this)(
      transformedLeft as T,
      transformedRight as T
    ) as this;
  }
}

export class Implies extends BinFormula<Formula> {
  constructor(left: Formula, right: Formula) { super(left, right) }

  nonParenthesizedToString() {
    return `${this.getLeft()} => ${this.getRight()}`;
  }

  toZ3(z3env: Z3Env): Z3.Bool {
    return (this.getLeft().toZ3(z3env) as Z3.Bool).implies(this.getRight().toZ3(z3env) as Z3.Bool);
  }
}

export class And extends BinFormula<Formula> {
  constructor(left: Formula, right: Formula) { super(left, right) }

  nonParenthesizedToString() {
    return `${this.getLeft()} && ${this.getRight()}`;
  }

  toZ3(z3env: Z3Env): Z3.Bool {
    return (this.getLeft().toZ3(z3env) as Z3.Bool).and(this.getRight().toZ3(z3env) as Z3.Bool);
  }
}

export class Or extends BinFormula<Formula> {
  constructor(left: Formula, right: Formula) { super(left, right) }

  nonParenthesizedToString() {
    return `${this.getLeft()} || ${this.getRight()}`;
  }

  toZ3(z3env: Z3Env): Z3.Bool {
    return (this.getLeft().toZ3(z3env) as Z3.Bool).or(this.getRight().toZ3(z3env) as Z3.Bool);
  }
}

/*************************
   Comparison operators
**************************/

export class Eq extends BinFormula<ArithExpr> {
  constructor(left: ArithExpr, right: ArithExpr) { super(left, right) }

  nonParenthesizedToString() {
    return `${this.getLeft()} = ${this.getRight()}`;
  }

  toZ3(z3env: Z3Env): Z3.Bool {
    return this.getLeft().toZ3(z3env).eq(this.getRight().toZ3(z3env));
  }
}

export class Neq extends BinFormula<ArithExpr> {
  constructor(left: ArithExpr, right: ArithExpr) { super(left, right) }

  nonParenthesizedToString() {
    return `${this.getLeft()} != ${this.getRight()}`;
  }

  toZ3(z3env: Z3Env): Z3.Bool {
    return this.getLeft().toZ3(z3env).neq(this.getRight().toZ3(z3env));
  }
}

export class Lt extends BinFormula<ArithExpr> {
  constructor(left: ArithExpr, right: ArithExpr) { super(left, right) }

  nonParenthesizedToString() {
    return `${this.getLeft()} < ${this.getRight()}`;
  }

  toZ3(z3env: Z3Env): Z3.Bool {
    return this.getLeft().toZ3(z3env).lt(this.getRight().toZ3(z3env));
  }
}

export class Lte extends BinFormula<ArithExpr> {
  constructor(left: ArithExpr, right: ArithExpr) { super(left, right) }

  nonParenthesizedToString() {
    return `${this.getLeft()} <= ${this.getRight()}`;
  }

  toZ3(z3env: Z3Env): Z3.Bool {
    return this.getLeft().toZ3(z3env).le(this.getRight().toZ3(z3env));
  }
}

export class Gt extends BinFormula<ArithExpr> {
  constructor(left: ArithExpr, right: ArithExpr) { super(left, right) }

  nonParenthesizedToString() {
    return `${this.getLeft()} > ${this.getRight()}`;
  }

  toZ3(z3env: Z3Env): Z3.Bool {
    return this.getLeft().toZ3(z3env).gt(this.getRight().toZ3(z3env));
  }
}

export class Gte extends BinFormula<ArithExpr> {
  constructor(left: ArithExpr, right: ArithExpr) { super(left, right) }

  nonParenthesizedToString() {
    return `${this.getLeft()} >= ${this.getRight()}`;
  }

  toZ3(z3env: Z3Env): Z3.Bool {
    return this.getLeft().toZ3(z3env).ge(this.getRight().toZ3(z3env));
  }
}

/*************************
      Arith expr
**************************/

export type ArithExpr =
  | NumLit
  | Var
  | Plus
  | Minus
  | Mult
  | Divide

export function isArithExpr(obj: any) {
  return obj instanceof BaseArithExpr;
}

abstract class BaseArithExpr extends BaseExpr {
  getZ3Sort(z3env: Z3Env) {
    return z3env.z3context.Int.sort();
  }

  abstract toZ3(z3env: Z3Env): Z3.Arith;

  abstract subst(v: Var, expr: ArithExpr): BaseArithExpr;
}

export class NumLit extends BaseArithExpr {
  readonly #value: number;
  constructor(readonly value: number) {
    super();
    this.#value = value;
  }

  getValue() {
    return this.#value;
  }

  nonParenthesizedToString(): string {
    return this.value.toString();
  }

  shouldParenthesize() {
    return ShouldParenthesizeStatus.NoParen;
  }

  toZ3(z3env: Z3Env) {
    return z3env.z3context.Int.val(this.getValue());
  }

  subst(_v: Var, _expr: Expr) {
    return this;
  }

  getFreeProgramVars(): Var[] {
    return [];
  }

  getChildren(): Expr[] {
    return []
  }

  map(
    _transformFormula: (f: Formula) => Formula,
    _transformArith: (a: ArithExpr) => ArithExpr
  ): this {
    return this;
  }
}

/** Assuming for now that integer variables are the only kind of variable */
export class Var extends BaseArithExpr {
  readonly #name: Name;
  constructor(name: Name) {
    super();
    this.#name = name;
  }

  getName(): Name {
    return this.#name;
  }

  nonParenthesizedToString() {
    return this.getName();
  }

  shouldParenthesize() {
    return ShouldParenthesizeStatus.NoParen;
  }

  toZ3(z3env: Z3Env) {
    return z3env.z3context.Int.const(this.getName() as string);
  }

  subst(v: Var, expr: ArithExpr) {
    return this.isEqualTo(v) ? expr : this;
  }

  getFreeProgramVars(): Var[] {
    return [this];
  }

  getChildren(): Expr[] {
    return [];
  }

  map(
    _transformFormula: (f: Formula) => Formula,
    _transformArith: (a: ArithExpr) => ArithExpr
  ): this {
    return this;
  }
}


/****************************
    Arithmetic binary expr
*****************************/

/** Helper base class */
export abstract class BinArithExpr extends BaseArithExpr {
  readonly #left: ArithExpr;
  readonly #right: ArithExpr;
  constructor (left: ArithExpr, right: ArithExpr) {
    super();
    this.#left = left;
    this.#right = right;
  }

  getLeft() {
    return this.#left;
  }

  getRight() {
    return this.#right;
  }

  getChildren(): [ArithExpr, ArithExpr] {
    return [this.#left, this.#right];
  }

  shouldParenthesize() {
    // a default simple implementation; can make this more selective in the future
    return ShouldParenthesizeStatus.AddParen;
  }

  subst(v: Var, expr: ArithExpr): this {
    return new (this.constructor as new (left: ArithExpr, right: ArithExpr) => this)(
      this.getLeft().subst(v, expr),
      this.getRight().subst(v, expr)
    );
  }

  map(
    _transformFormula: (f: Formula) => Formula,
    transformArith: (a: ArithExpr) => ArithExpr
  ): this {
    return new (this.constructor as new (left: ArithExpr, right: ArithExpr) => this)(
      transformArith(this.getLeft()),
      transformArith(this.getRight())
    ) as this;
  }
}

export class Plus extends BinArithExpr {
  constructor(left: ArithExpr, right: ArithExpr) { super(left, right) }

  nonParenthesizedToString() {
    return `${this.getLeft()} + ${this.getRight()}`;
  }

  toZ3(z3env: Z3Env): Z3.Arith {
    return this.getLeft().toZ3(z3env).add(this.getRight().toZ3(z3env));
  }
}

export class Minus extends BinArithExpr {
  constructor(left: ArithExpr, right: ArithExpr) { super(left, right) }

  nonParenthesizedToString() {
    return `${this.getLeft()} - ${this.getRight()}`;
  }

  toZ3(z3env: Z3Env): Z3.Arith {
    return this.getLeft().toZ3(z3env).sub(this.getRight().toZ3(z3env));
  }
}

export class Mult extends BinArithExpr {
  constructor(left: ArithExpr, right: ArithExpr) { super(left, right) }

  nonParenthesizedToString() {
    return `${this.getLeft()} * ${this.getRight()}`;
  }

  toZ3(z3env: Z3Env): Z3.Arith {
    return this.getLeft().toZ3(z3env).mul(this.getRight().toZ3(z3env));
  }
}

/**
 * This implements:
 *
 * (i)  x/0 == 0 for all x
 *
 * (ii) truncated division; i.e., m/n := always the integer part of m/n (rounding towards 0)
 *
 * We need (ii),
 * because the default behavior for integer division for Z3 is:
 *  > when n is negative, (div m n) is the ceiling of m/n.
 * (See https://smt-lib.org/theories-Ints.shtml)
 *
 * Implementation adapted from https://gist.github.com/Rufflewind/a880e03fb0d13644a1e8
 */
function makeZ3Div(z3env: Z3Env, dividend: Z3.Arith<"main">, divisor: Z3.Arith<"main">) {
  const zero = z3env.z3context.Int.val(0);
  const one = z3env.z3context.Int.val(1);
  const [If, Or] = [z3env.z3context.If, z3env.z3context.Or];
  return If(
    divisor.eq(zero),
    zero,
    If(
      Or(dividend.mod(divisor).eq(zero), dividend.ge(zero)),
      dividend.div(divisor),
      If(
        divisor.ge(zero),
        dividend.div(divisor).add(one),
        dividend.div(divisor).sub(one)
      )
    )
  );
}

export class Divide extends BinArithExpr {
  constructor(left: ArithExpr, right: ArithExpr) { super(left, right) }

  nonParenthesizedToString() {
    return `${this.getLeft()} / ${this.getRight()}`;
  }

  toZ3(z3env: Z3Env): Z3.Arith {
    return makeZ3Div(z3env, this.getLeft().toZ3(z3env), this.getRight().toZ3(z3env))
  }
}

export class Modulo extends BinArithExpr {
  constructor(left: ArithExpr, right: ArithExpr) { super(left, right) }

  nonParenthesizedToString() {
    return `${this.getLeft()} % ${this.getRight()}`;
  }

  toZ3(z3env: Z3Env): Z3.Arith {
    const [dividend, modulus] = [this.getLeft().toZ3(z3env), this.getRight().toZ3(z3env)];
    // x/0 = 0 => x % 0 = x
    return z3env.z3context.If(
      modulus.eq(z3env.z3context.Int.val(0)),
      dividend,
      dividend.sub(makeZ3Div(z3env, dividend, modulus).mul(modulus))
    );
  }
}

/********************
    Built ins
*********************/

export type InterpretedFunctionName = keyof typeof INTERPRETED_FUNCTIONS;

export function isInterpretedFunction(name: string): name is InterpretedFunctionName {
  return Object.hasOwn(INTERPRETED_FUNCTIONS, name);
}

export const INTERPRETED_FUNCTIONS = {
  "even": {
    arity: 1,
    makeReplacement: (...args: ArithExpr[]): Formula => new Eq(new Modulo(args[0], new NumLit(2)), new NumLit(0))
  },
  "odd": {
    arity: 1,
    makeReplacement: (...args: ArithExpr[]): Formula => new Eq(new Modulo(args[0], new NumLit(2)), new NumLit(1))
  }
}

/**************
    Misc
***************/

export type LineComment = Branded<string, 'LineComment'>;

/** TS-pattern can deal with string enums -- it's numeric enums that TS and TS-pattern struggle with */
enum ShouldParenthesizeStatus {
  AddParen = 'add-paren',
  NoParen = 'no-paren'
}

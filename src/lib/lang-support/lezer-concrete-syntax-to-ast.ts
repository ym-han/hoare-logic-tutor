/*

The following is obviously fragile.
TODO: When time permits, I'll probably replace the Lezer parser with something like a Langium (https://langium.org/) parser,
which allows you to write a grammar and get a parser directly to simple ASTs like the Imp AST --- i.e.,
without having to also write transformations from the concrete to abstract syntax.

Using a non-Lezer parser with CodeMirror would require writing some glue code.
But that's a one-time cost,
compared to having to change the transformations from the concrete to abstract syntax every time we want to tweak the grammar or abstract syntax.

*/

import { match, P } from 'ts-pattern';
import { parser } from './lezer-imp/lezer-imp.js';
import { Parser, TreeCursor } from '@lezer/common';
import type { Decl, Command, Formula, Name, ArithExpr, ParserInfo } from './imp-ast.ts';
import { COMMAND_DELIMITER } from './imp-language-support.ts';
import {
  isInterpretedFunction,
  INTERPRETED_FUNCTIONS,
  isFormula,
  Assign,
  Skip,
  isAssertion,
  Assertion,
  isCommand,
  BoolLit,
  PredicateApp,
  Not,
  And,
  Or,
  Implies,
  Eq,
  Neq,
  Lt,
  Lte,
  Gt,
  Gte,
  NumLit,
  Var,
  Plus,
  Minus,
  Mult,
  Divide,
  Modulo
} from './imp-ast.ts';

/*******************************
         Entrypoint
********************************/

/** (Entrypoint) Parse a string to an Imp Decl and desugar it / handle built-in interpreted functions. */
export function parse(src: string) {
  const trimmedSrc = src.trim();
  const parserInfo: ParserInfo = {
    originalInput: trimmedSrc
  };
  return desugar(toImpDecl(parser, parserInfo, trimmedSrc));
}

function toImpDecl(parser: Parser, parserInfo: ParserInfo, src: string): Decl {
  const lezerConcreteSyntaxTree = parser.parse(src);
  return concreteSyntaxToAbstractSyntax(lezerConcreteSyntaxTree.cursor(), parserInfo, src);
}

/*******************************************
      Convenience functions / utils
********************************************/

/** Convenience util for parsing specifically to Assertion, for use elsewhere.
 *
 * Does run-time check for whether the parsed output is an Assertion (as opposed to some other kind of Decl).
 */
export function parseToAssertion(src: string): Assertion {
  const putativeAssertion = parse(src);
  if (!isAssertion(putativeAssertion))  throw new Error(`${src} is not an Assertion!`);
  return putativeAssertion;
}

/** Convenience util for parsing specifically to Command, for use elsewhere.
*
* Does run-time check for whether the parsed output is a Command (as opposed to some other kind of Decl).
*/
export function parseToCommand(src: string): Command {
  const trimmedCommand = src.trim();
  const cmdString = trimmedCommand.endsWith(COMMAND_DELIMITER) ? trimmedCommand : trimmedCommand + COMMAND_DELIMITER;

  const putativeCommand = parse(cmdString);
  if (!isCommand(putativeCommand)) throw new Error(`${src} is not a Command!`);
  return putativeCommand;
}


/*******************************
    Core traversals
********************************/

/** Converts a [Lezer concrete syntax tree](https://lezer.codemirror.net/docs/ref/) to our Imp abstract syntax.
 * Does this by traversing the CST with the [`TreeCursor`](https://lezer.codemirror.net/docs/ref/#common.TreeCursor).
 */
 export function concreteSyntaxToAbstractSyntax(
   cursor: TreeCursor,
   parserInfo: ParserInfo,
   src: string
 ): Decl {
   return match(cursor.node.type.name)
     .with('TopDecl', () => {
       cursor.firstChild();
       const decl = match(cursor.node.type.name)
         .with('Assertion', () => {
           const commaSepFormulas: Formula[] = gatherFormulasInAssertion(cursor, src);
           const conjoinedFormula = commaSepFormulas.reduceRight((acc, newFormula) =>
             new And(newFormula, acc)
           );
           return new Assertion(parserInfo, conjoinedFormula);
         })
         .with('Command', () => {
           cursor.firstChild();
           // Will need more sophisticated cursor handling if we have commands with more structure --- see gatherFormulasInAssertion.
           // (But hopefully will have moved away from Lezer by then.)
           return translateCommand(parserInfo, cursor, src);
         })
         .otherwise(() => {
           throw new RefineLezerParseError('Expected Assertion or Command but got', cursor, src);
         });
       cursor.parent();
       return decl;
     })
     .otherwise(() => {
       throw new RefineLezerParseError('Expected a top-level declaration (i.e., a Assertion or Command) but got', cursor, src);
     });
 }

function translateCommand(parserInfo: ParserInfo, cursor: TreeCursor, src: string): Command {
  return match(cursor.node.type.name)
    .with('Assign', () => {
      cursor.firstChild();
      const varName = src.substring(cursor.from, cursor.to) as Name;
      const variable = new Var(varName);

      cursor.nextSibling(); // Move to AssignOp
      cursor.nextSibling(); // Move to expression

      const value = translateArithmeticExpression(cursor, src);

      cursor.parent();
      return new Assign(parserInfo, variable, value);
    })
    .with('CmdSkip', () => {
      return new Skip(parserInfo);
    })
    .otherwise(() => {
      throw new RefineLezerParseError('Expected a Command but got', cursor, src);
    });
}

/** Traverses formula nodes in the CST, converting them to Formula AST nodes */
export function translateFormula(cursor: TreeCursor, src: string): Formula {
  const nodeType: string = cursor.node.type.name;

  return match(nodeType)
    .with('LitBool', () => {
      const lit = src.substring(cursor.from, cursor.to);
      return new BoolLit(lit === 'true');
    })
    .with('PredicateApp', () => {
      cursor.firstChild();
      const name = src.substring(cursor.from, cursor.to) as Name;
      cursor.nextSibling();
      const args = parseArgList(cursor, src);
      cursor.parent();
      return new PredicateApp(name, args);
    })
    .with('AndE', () => {
      const { left, right } = walkBinTreeCursor(cursor, src, translateFormula);
      return new And(left, right);
    })
    .with('OrE', () => {
      const { left, right } = walkBinTreeCursor(cursor, src, translateFormula);
      return new Or(left, right);
    })
    .with('CompE', () => {
      const { left, right, op } = walkBinTreeCursor(cursor, src, translateArithmeticExpression);

      return match(op)
        .with('=', () => new Eq(left, right))
        .with('!=', () => new Neq(left, right))
        .with('<', () => new Lt(left, right))
        .with('<=', () => new Lte(left, right))
        .with('>', () => new Gt(left, right))
        .with('>=', () => new Gte(left, right))
        .otherwise(() => {
          throw new RefineLezerParseError('Expected comparison op but got', cursor, src);
        });
    })
    .with('NegE', () => {
      cursor.lastChild();
      const negand = translateFormula(cursor, src);
      cursor.parent();
      return new Not(negand);
    })
    .with('ImpliesE', () => {
      const { left, right } = walkBinTreeCursor(cursor, src, translateFormula);
      return new Implies(left, right);
    })
    .with('ParenthesizedFormula', () =>
      walkParenthesizedExpression(cursor, src, translateFormula)
    )
    .otherwise(() => {
      throw new RefineLezerParseError(`Expected formula but got`, cursor, src);
    });
}

/** Traverses arithmetic expression nodes in the CST, converting them to ArithExpr AST nodes */
function translateArithmeticExpression(cursor: TreeCursor, src: string): ArithExpr {
  const nodeType = cursor.node.type.name;

  return match(nodeType)
    .with('Name', () => {
      const name = src.substring(cursor.from, cursor.to) as Name;
      return new Var(name);
    })
    .with('LitNumber', () => {
      const num = Number(src.substring(cursor.from, cursor.to));
      return new NumLit(num);
    })
    .with('BinArithE', () => {
      const { left, right, op } = walkBinTreeCursor(cursor, src, translateArithmeticExpression);

      return match(op)
        .with('+', () => new Plus(left, right))
        .with('-', () => new Minus(left, right))
        .with('*', () => new Mult(left, right))
        .with('/', () => new Divide(left, right))
        .with('%', () => new Modulo(left, right))
        .otherwise(() => {
          throw new RefineLezerParseError('Unexpected arithmetic op', cursor, src);
        });
    })
    .with('UnaryExpr', () => {
      cursor.firstChild();
      const op = src.substring(cursor.from, cursor.to);
      cursor.nextSibling();
      const expr = translateArithmeticExpression(cursor, src);
      cursor.parent();

      return match(op)
        .with('+', () => expr)
        .with('-', () => new Mult(new NumLit(-1), expr))
        .otherwise(() => {
          throw new RefineLezerParseError('Unexpected unary op', cursor, src);
        });
    })
    .with('ParenthesizedArithExp', () =>
      walkParenthesizedExpression(cursor, src, translateArithmeticExpression)
    )
    .otherwise(() => {
      throw new RefineLezerParseError(`Expected arithmetic expression but got`, cursor, src);
    });
}

/************************
   CST traversal helpers
*************************/

type BranchDispatcher<Branch> = (cursor: TreeCursor, src: string) => Branch;

function walkParenthesizedExpression<Expr>(
  cursor: TreeCursor,
  src: string,
  handler: (cursor: TreeCursor, src: string) => Expr
): Expr {
  cursor.firstChild();
  cursor.nextSibling();
  const result = handler(cursor, src);
  cursor.parent();
  return result;
}

function walkBinTreeCursor<Branch>(
  cursor: TreeCursor,
  src: string,
  dispatchBranch: BranchDispatcher<Branch>
) {
  cursor.firstChild();
  const left = dispatchBranch(cursor, src);
  cursor.nextSibling();
  // We need the op for some but not all callers
  const op: string = src.substring(cursor.from, cursor.to);
  cursor.nextSibling();
  const right = dispatchBranch(cursor, src);
  cursor.parent();

  return { left, right, op};
}

/** Parses an argument list in a predicate application */
function parseArgList(cursor: TreeCursor, src: string): ArithExpr[] {
  cursor.firstChild(); // enter ArgList
  const args: ArithExpr[] = [];

  while (cursor.nextSibling()) {
    // Skip commas and parentheses
    if ([',', ')'].includes(cursor.node.type.name)) continue;
    try {
      const arg = translateArithmeticExpression(cursor, src)
      args.push(arg);
    } catch {
      // console.log('the issue: ', src.substring(cursor.from, cursor.to));
      throw new RefineLezerParseError('Could not parse argument to predicate. Predicate arguments must be integer expressions.', cursor, src);
    }
  }

  cursor.parent();
  return args;
}

/** Gathers all formulas in an assertion node */
function gatherFormulasInAssertion(cursor: TreeCursor, src: string) {
  const formulas = [];
  cursor.firstChild();

  do {
    formulas.push(translateFormula(cursor, src));
  } while (cursor.nextSibling());

  return formulas;
}

/******************************************
  Builtin / Interpreted Functions Handling
*******************************************/

function desugar(decl: Decl): Decl {
  // Macro expand interpreted functions
  // We can make this cleaner after generalizing the strategy combinator library

  const desugarFormula = (formula: Formula): Formula => {
    return match(formula)
      .with(P.instanceOf(PredicateApp), (predApp) => {
        const predName = predApp.getPredicateName() as string;
        if (isInterpretedFunction(predName) &&
          predApp.getArgs().length === INTERPRETED_FUNCTIONS[predName].arity) {
          return INTERPRETED_FUNCTIONS[predName].makeReplacement(...predApp.getArgs());
        } else {
          return predApp;
        }
      })
      .otherwise(() => formula.map(desugarFormula, (ae: ArithExpr) => ae) as Formula) ;
  }

  const desugarDecl = (decl: Decl): Decl => {
    return match(decl)
      .with(P.instanceOf(Assertion), (decl) => {
        return decl.map(desugarFormula, (ae: ArithExpr) => ae)
      })
      .otherwise(() => decl);
  }

  return desugarDecl(decl);
}


/*********************
    Custom Error
**********************/

export class RefineLezerParseError extends Error {
  name = 'RefineLezerParseError';

  constructor(message: string, cursor: TreeCursor, src: string) {
    const augmentedMessage =
      `${cursor.node.from}-${cursor.node.to}: ${message} \`${src.substring(cursor.from, cursor.to)}\`.`;
    super(augmentedMessage);
  }
}

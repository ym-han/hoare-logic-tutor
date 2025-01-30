import { match } from 'ts-pattern';
import type { AlrNode, AlrContext } from '$lib/alr-core/index.ts';
import {type Optional, makeJust, makeNothing, liftToOptional} from '$lib/utils.ts';

/* See
  The Essence of Strategic Programming
  Design Patterns for Functional Strategic Programming
  ---------------------------------------------------

  Notes from Nov 7:
    * Do we need strategies as well for modifying AlrNodes in place?
    Strategies that are mutating should be clearly marked so, either with a namespace or in their names

    make sure to pass in AlrContext if need to register new nodes. Can do cool things by passing in different context.

  TODO, week of Nov 11 - 15:
    * Check whether the strategy combinators below do enough passing in / passing around of AlrContext --- didn't fully understand if there was something missing / wrong with the following

*/

// In Haskell, would do `type TransformM = AlrNode -> m AlrNode`. Specializing here to the Maybe monad.
// Exercise to the reader to specialize to a different monad
export type Rewrite = (context: AlrContext, node: AlrNode) => Optional<AlrNode>;
export type Transform<T> = (context: AlrContext, node: AlrNode) => Optional<T>;

/*********************************
************  Rewrites ***********
**********************************/

/*********************
  Basic rewrites
**********************/

export const identityR = identityT<AlrNode>;

export const failR: Rewrite = failT<AlrNode>;

export const adhocR = <T extends AlrNode, B extends AlrNode>(
  test: (n: AlrNode) => n is T,
  f: (context: AlrContext, t: T) => Optional<B>,
  g: Rewrite
): Rewrite => {
  return (context: AlrContext, n: AlrNode) => {
    if (test(n)) {
      return f(context, n);
    } else {
      return g(context, n);
    }
  };
};

/** Applies a rewrite to all immediate subterms of the current term. Fails if the AlrNode has no children */
export const allR = (t: Rewrite): Rewrite => {
  return (context: AlrContext, n: AlrNode) => {
    // If leaf
    if (n.getChildren(context).length === 0) {
      return { type: 'failure' };
    }

    // If non-leaf
    const mappingFunc = <T extends AlrNode>(ctx: AlrContext, node: T): T => {
      return match(t(ctx, node))
        .with({ type: 'success' }, ({ value }) => (value as T))
        .with({ type: 'failure' }, () => (node))
        .exhaustive();
    };

    return makeJust(n.map(context, mappingFunc));
  };
};

/** Sequence for rewrites.

Seqeuence has Identity as an identity element
and Fail as an absorbing / zero element */
export const sequenceR = (t1: Rewrite, t2: Rewrite): Rewrite => (sequenceT(t1, t2));

export const leftBiasedChoiceR = (t1: Rewrite, t2: Rewrite): Rewrite => leftBiasedChoiceT(t1, t2);

/*********************
  Traversal rewrites
**********************/

/** tdR means: top down (pre-order) rewrite.
 * This seems to correspond to `TopDown` from the visitor combinators and strategic programming papers
 */
export const alltdR = (t: Rewrite): Rewrite => {
  return (context: AlrContext, n: AlrNode) => sequenceR(t, allR(alltdR(t)))(context, n);
};


/**********************************
*********  Transforms *************
***********************************/

/*********************
  Basic transforms
**********************/

/** id@t => t */
export function identityT<T>(_context: AlrContext, value: T): Optional<T> {
  return makeJust(value);
}

export function failT<T>(_context: AlrContext, _: AlrNode): Optional<T> {
  return makeNothing();
}

/** Generic constant function, specialized to the Maybe ('Result') monad. */
export function compute<T>(mresult: Optional<T>): Transform<T> {
  return (_context: AlrContext, _n: AlrNode) => mresult;
}

export const adhocT = <A extends AlrNode, B>(
  test: (n: AlrNode) => n is A,
  f: (context: AlrContext, t: A) => Optional<B>,
  g: Transform<B>
): Transform<B> => {
  return (context: AlrContext, n: AlrNode) => {
    if (test(n)) {
      return f(context, n);
    } else {
      return g(context, n);
    }
  }
};

/** Choice has Identity as left-zero but not as right-zero

      Choice(Fail, v)     = v

      Choice(v,    Fail)  = v

      Choice(Identity, v) = Identity
*/
export const leftBiasedChoiceT = <T>(t1: Transform<T>, t2: Transform<T>): Transform<T> => {
  return (context: AlrContext, n: AlrNode) => {
    const n2 = t1(context, n);
    return match(n2)
      .with({ type: 'success' }, (result) => result)
      .with({ type: 'failure' }, () => t2(context, n))
      .exhaustive();
  };
};

/** Sequence: (s; s')@t => s'@(s@t)

Seqeuence has Identity as an identity element

  Sequence(Identity, v) = v

  Sequence(v, Identity) = v

and Fail as an absorbing / zero element

  Sequence(Fail, v) = Fail

  Sequence(v, Fail) = Fail   if v is side-effect-free

> For the seq combinators, the first argument strategy is type-preserving,
and its output is given to the second argument strategy as input
(from Design Patterns for Functional Strategic Programming)
*/
export const sequenceT = <T>(t1: Rewrite, t2: Transform<T>): Transform<T> => {
  return (context: AlrContext, n: AlrNode) => {
    const n2 = t1(context, n);
    return match(n2)
      .with({ type: 'success' }, ({ value }) => t2(context, value))
      .with({ type: 'failure' }, () => (makeNothing() as Optional<T>))
      .exhaustive();
  };
};

/**
 * "For the let combinators, the first argument strategy is always type-unifying, and the second argument is a strat- egy parameterized with a value of the unifying type a. The result value of the first argument is used to instantiate the parameter of the second argument." (Design Patterns)
 * letTU :: Monad m => TU a m -> (a -> TU b m) -> TU b m
 *
 * The equivalent in "The Essence of Strategic Programming" seems to be
 * pass = \f g x -> f x >>= \y -> g y x
 */
export const letT = <A, B>(t1: Transform<A>, kont: (result1: A) => Transform<B>): Transform<B> => {
  return (context: AlrContext, n: AlrNode) => {
    const result1 = t1(context, n);
    return match(result1)
      .with({ type: 'success' }, ({ value }) => kont(value)(context, n))
      .with({ type: 'failure' }, () => (makeNothing() as Optional<B>))
      .exhaustive();
  };
};

/** Corresponds to
 * allTU :: (Monoid a) => TU a -> TU a
 * specialized to Maybe ('Result') monad */
export const allT = <A>(combine: (a1: A, a2: A) => A, t: Transform<A>): Transform<A> => {
  return (context: AlrContext, n: AlrNode) => {
    const liftedCombine = liftToOptional(combine);
    const children = n.getChildren(context)
                      .map(t.bind(null, context));
    return match(children)
      .with([], () => ({ type: 'failure' as const})) // i.e., `n` is a leaf
      .otherwise((results) => (results.reduceRight(liftedCombine)));
  }
};


/***********************************
  Control and data flow transforms
************************************/

/** Variant of `compute` with non-monadic domain
 */
export function build<T>(result: T): Transform<T> {
  return compute(makeJust(result));
}

/** Combine the results from two strategies with binary operator `combine`
 * TODO: Check / test this!
 */
export const combineT = <A, B>(
  combine: (result1: A, result2: B) => B,
  t1: Transform<A>,
  t2: Transform<B>): Transform<B> => {
  const kont1 = (result1: A): Transform<B> => {
    const kont2 = (result2: B) => build(combine(result1, result2));
    return letT(t2, kont2);
  };
  return letT(t1, kont1);
}

/***********************************
  Traversal transforms
************************************/

/** Combine the results of applying `t` to all nodes with `combine` (which will be lifted to `Result` in an Alternative-like way)
 * TODO: Check / test this!
*/
export const crush = <T>(combine: (result1: T, result2: T) => T, t: Transform<T>): Transform<T> => {
  return combineT(combine, t, allT(combine, crush(combine, t)));
}

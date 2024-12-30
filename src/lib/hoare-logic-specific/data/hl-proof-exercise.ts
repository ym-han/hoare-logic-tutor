import {type ValueOf, UnreachableCaseError} from "$lib/utils.ts";
import { type Assertion, type Command, isAssertion, isCommand } from '$lib/lang-support/index.ts';
import type { DefaultAlrNodeInfo, AlrNode, AlrSource } from '$lib/alr-core/index.ts';
import {
  type ProofStepAlrNode,
  HLProofExerciseAlrNode,
  GivenAssertionAlrNode,
  CommandAlrNode,
  HoleAlrNode,
  HoleAndFeedbackAlrNode,
  RemarkAlrNode
} from '../alr/index.ts';
import { AssertionPrevalidator, type ExerciseFeedbackGiver, type AnswerPrevalidator } from "../answer-checker.ts";

/**********************************************************************
 ********* Data Sources for HLProofExercise and related things  *******
 **********************************************************************/

export const HLProofExerciseDataSource: AlrSource<HLProofExercise, HLProofExerciseAlrNode> = {
  toAlr(nodeInfo: DefaultAlrNodeInfo, hlProofExercise: HLProofExercise) {
    const proofStepNodes: Array<AlrNode> = [];
    hlProofExercise.getProofSteps().forEach((hlProofStep: HLProofStep) => {
      const proofStepNode = HLProofStepDataSource.toAlr(nodeInfo, hlProofStep);
      proofStepNodes.push(proofStepNode);
    });
    return new HLProofExerciseAlrNode(nodeInfo, proofStepNodes as ProofStepAlrNode[], hlProofExercise.getFeedbackGiver());
  }
};

export const HLProofStepDataSource: AlrSource<HLProofStep, AlrNode> = {
  toAlr(nodeInfo: DefaultAlrNodeInfo, hlProofStep: HLProofStep) {
    if (isAssertionHole(hlProofStep)) {
      // TODO/TOCHECK: May be confusing to have AnswerChecker in the Hole ProofStep but not in the HoleAlr
      const holeAlr = new HoleAlrNode(nodeInfo, hlProofStep, 'AssertionHole');
      return new HoleAndFeedbackAlrNode(nodeInfo, holeAlr);
    } else if (isAssertion(hlProofStep)) {
      return GivenAssertionAlrNode.make(nodeInfo, hlProofStep);
    } else if (isCommand(hlProofStep)) {
      return CommandAlrNode.make(nodeInfo, hlProofStep);
    } else if (isRemark(hlProofStep)) {
      return RemarkAlrNode.make(nodeInfo, hlProofStep);
    } else {
      throw new UnreachableCaseError(hlProofStep);
    }
  }
};

/**********************************************
 *********** HL Proof Exercise ****************
 **********************************************/

/** This is what you would use to make the 'HL Proof' exercises.
 * That is, for a 'HL Proof' exercise like

    ```ascii
    { blank }
    Hint: the assertion above should be a simplification of the one below.
    { blank }
    b := 2 - a
    { blank }
    c := b + 2
    { blank }
    d := c + 1
    { d = 5 }
    ```

  you would make the corresponding HLProofSteps,
  and then make a HLProofExercise via `new HLProofExercise(...the HLProofSteps...)`.
  (Further helper functions may be provided in the future.)

  A `HLProofExerciseAlrNode` can then be generated from this `HLProofExercise`,
  using the `HLProofExerciseDataSource`.
 */
export class HLProofExercise {

  constructor(private readonly exercise: HLProofStep[], private readonly feedbackGiver: ExerciseFeedbackGiver) {
  }

  getFeedbackGiver() {
    return this.feedbackGiver;
  }

  getProofSteps(): Array<HLProofStep> {
    return this.exercise;
  }

  /** Get a specific proof step by index */
  getProofStep(index: number): HLProofStep | undefined {
    return this.exercise[index];
  }

  getNumProofSteps(): number {
    return this.exercise.length;
  }
}

/**********************************************
 ************  HLProofStep ********************
 **********************************************/

// single assertion type where the assertion can have holes in them
// JK: Better for this to be closed
// If procesing proof, closedness essential.
// Checkers demand closeness --- assuming restrictions on what inputs can be / making assumptions about what's *not* there
// Open constraint generator, closed solver
// e.g., if putting stuff into Z3, need to know that it's the kind of stuff Z3 can solve
export type HLProofStep = Assertion | Hole<'AssertionHole'> | Command | Remark;


/**********************************************
 ********* HoleTypes and Holes ****************
 **********************************************/

// TODO Nov7: Check that the 'type guards for Hole<A>' stuff is OK

/**
 * enum: an arbitray subset of enums cannot be a type. TS-pattern needs subset of types to be a type.
 * So: This has to be a union type, if we want to use TS-pattern.
 * But we can change it later if necessary -- should be an ez change.
 */
export type HoleType = 'AssertionHole' // and possibly other things -- -this shld be union type

export type HoleFiller = ValueOf<HoleTypeToFiller>;

/** This probably won't be a bijection */
export type HoleTypeToFiller = {
  ['AssertionHole']: Assertion;
}

/*********************************************
********* AssertionHole **********************
**********************************************/

const defaultAssertionHolePlaceholderPrompt = '{ }';

/** EG: Hole<'AssertionHole'> */
export class Hole<T extends HoleType> {
  // Design note: Constructors should be simple and not be something that can fail
  /** @param answer - E.g, an Assertion if the `A` type is `Assertion`. Example of a stringified Assertion: `{d = 5}`
   *  @param placeholderPrompt - text that's initially displayed in the blank field
   */
  constructor(
    readonly type: T,
    // private readonly answer: HoleTypeToFiller[T],
    private readonly prevalidator: AnswerPrevalidator,
    private readonly placeholderPrompt: string) {}

  /** the official answer */
  // getAnswer() {
  //   return this.answer;
  // }

  /** Get something that can be used to prevalidate a student attempt. */
  getAnswerPrevalidator() {
    return this.prevalidator;
  }

  /** By a placeholder prompt, I mean text that's initially displayed in the blank field */
  getPlaceholderPrompt(): string {
    return this.placeholderPrompt;
  }
}

/** Smart / convenience constructor */
export function makeAssertionHole(
  nodeInfo: DefaultAlrNodeInfo,
  placeholderPrompt?: string
): Hole<'AssertionHole'> {
  const retPlaceholderPrompt = placeholderPrompt ?? defaultAssertionHolePlaceholderPrompt;
  return new Hole('AssertionHole', new AssertionPrevalidator(nodeInfo), retPlaceholderPrompt);
}

// /** Smart / convenience constructor */
// export function makeAssertionHole(
//   officialAnswer: string,
//   checker: AnswerCheckerWithPrevalidation,
//   placeholderPrompt?: string
// ): Hole<'AssertionHole'> {
//   // This does the potentially failing parsing from answer string to Assertion
//   const retPlaceholderPrompt = placeholderPrompt ?? defaultAssertionHolePlaceholderPrompt;
//   const parsedAnswer = parseToAssertion(officialAnswer);

//   return new Hole('AssertionHole', parsedAnswer, checker, retPlaceholderPrompt);
// }

export const holeTypeIsAssertionHole = (type: HoleType) => type === 'AssertionHole';

export const isAssertionHole = (proofStep: HLProofStep): proofStep is Hole<'AssertionHole'> => {
  return proofStep instanceof Hole && holeTypeIsAssertionHole(proofStep.type);
};

/*********************************************
********* Remark ****************************
**********************************************/

// may not want / need this
export class Remark {
  #remark: string;

  constructor(remark: string) {
    this.#remark = remark.trim();
  }

  getBody(): string {
    return this.#remark;
  }
}

export const isRemark = (proofStep: HLProofStep): proofStep is Remark => {
  return proofStep instanceof Remark;
};

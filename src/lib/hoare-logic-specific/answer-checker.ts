import { FeedbackAlrNode, EmptyFeedbackAlrNode, IncorrectAttemptFeedbackAlrNode, CorrectAttemptFeedbackAlrNode, isIncorrectAttemptFeedbackAlrNode, NodeInfoManager } from '$lib/alr-core/index.ts';
import type { AlrContext, ExerciseAlrNode, DefaultAlrNodeInfo, AlrId, HasFeedback } from '$lib/alr-core/index.ts';
import { Feedback } from '$lib/hoare-logic-specific/data/index.ts';
import { HoareTriple, type Command, type Formula, type Z3Env } from '$lib/lang-support/index.ts';
import { z3ProveConjecture, parseToAssertion, RefineLezerParseError, Assign, Skip,
  // Sequence
} from '$lib/lang-support/index.ts';
import {HLProofExerciseAlrNode, HoareTripleAlrNode, CommandAlrNode, isCommandAlrNode, isCoreProofStepAlrNode, type CoreProofStepAlrNode, type HasAssertion, hasAssertion  } from '$lib/hoare-logic-specific/alr/index.ts';
import * as Z3 from 'z3-solver';
import { match, P } from 'ts-pattern';
import { codeBlock } from 'common-tags';

/*************************
      Prevalidator
**************************/

export interface AnswerPrevalidator {
  prevalidate(context: AlrContext, studentAttempt: string): Promise<FeedbackAlrNode>;
}

export class AssertionPrevalidator extends NodeInfoManager implements AnswerPrevalidator {
  constructor(readonly nodeInfo: DefaultAlrNodeInfo) {
    super(nodeInfo);
  }

  async prevalidate(context: AlrContext, studentAttempt: string) {
    const nodeInfo = this.makeNodeInfo(context);

    try {
      parseToAssertion(studentAttempt); // Just checking if it parses
      return new EmptyFeedbackAlrNode(nodeInfo);
    } catch (e) {
      const feedbackMessage = match(e)
        .with(P.instanceOf(RefineLezerParseError), (error) => `Parse error:\n${error.message}`)
        .otherwise(() => `An unknown error occurred when parsing ${studentAttempt}`);

      return FeedbackAlrNode.make(nodeInfo, new Feedback(feedbackMessage));
    }
  }
}

/************************************
    Exercise Feedback Giver
*************************************/

/** An Exercise Feedback Giver checks the sub-constituents of the exercise
 * and sets feedback on it.
 *
 * It differs from an AnswerChecker in that it's not primarily about checking answers,
 * but instead about coordinating the use of answer checker(s) for the exercise's subparts,
 * and setting feedback accordingly on the subparts.
 * (That's why the @exercise@ parameter is an AlrNode.)
 *
 * Now, this may in effect include some 'answer checking' logic for exercises where, eg, how the exercise's subparts are traversed affects the answer checking.
 * But the bulk of the answer checking logic will not be here --- it'll be in the answer checker(s) for the exercise's subparts.
 *
 * FeedbackGiver codebase: 'Reports of my death have been greatly exaggerated'. */
export interface ExerciseFeedbackGiver {
  /** Can consider returning a FeedbackAlrNode for the overall exercise in the future. */
  giveAndShowFeedback(context: AlrContext, exercise: ExerciseAlrNode): Promise<void>;
}

/** For tests / mocks */
export class DummyExerciseFeedbackGiver implements ExerciseFeedbackGiver {
  async giveAndShowFeedback(_context: AlrContext, _exercise: ExerciseAlrNode): Promise<void> {
  }
}

/************************************
       Answer Checker
*************************************/

// TODO: Clean up notes
// Notes from Dec 6: `studentAttempt` should be string instead of Assertion, given that the name (`AnswerChecker`) suggests it's going to be a generic interface that specific kinds of answer checker will implement
// Not a problem that it's end to end / cheks both for syntax errors and substantive equality check -- the interface does suggest it's end-to-end

/** Checker for (a self-contained) individual answer / attempt */
export interface AnswerChecker<A> {
  check(context: AlrContext, studentAttempt: A): Promise<FeedbackAlrNode>;
}


/*****************************************
  Exercise Feedback Giver and
  Answer Checker for HL Proof Exercise
******************************************/

export class HLProofExerciseZ3Checker extends NodeInfoManager implements ExerciseFeedbackGiver {
  #hoareTripleChecker: AnswerChecker<HoareTriple>;

  constructor(nodeInfo: DefaultAlrNodeInfo, protected readonly env: Z3Env, hoareTripleChecker?: AnswerChecker<HoareTriple>) {
    super(nodeInfo);

    this.#hoareTripleChecker = hoareTripleChecker ?? new IsLegitHoareTripleZ3Checker(nodeInfo, env);
  }

  async giveAndShowFeedback(context: AlrContext, exercise: HLProofExerciseAlrNode): Promise<void> {
    const nodeInfo = this.makeNodeInfo(context);
    const proofSteps = exercise.getProofSteps(context).filter(isCoreProofStepAlrNode);
    const reversedTriples = parseIntoHoareTriples(nodeInfo, proofSteps).toReversed();

    for (const tripleAlr of reversedTriples) {
      const ht = tripleAlr.getHoareTriple(context);
      if (!ht) break;

      const feedback = await this.#hoareTripleChecker.check(context, ht);
      tripleAlr.setFeedback(context, feedback);

      // Stop answer checking process at the first wrong attempt
      if (isIncorrectAttemptFeedbackAlrNode(feedback)) break;
    }
  }
}

export class IsLegitHoareTripleZ3Checker extends NodeInfoManager implements AnswerChecker<HoareTriple> {
  constructor(nodeInfo: DefaultAlrNodeInfo, protected readonly env: Z3Env) {
    super(nodeInfo);
  }

  /** Checks: Is it a legit hoare triple? */
  async check(context: AlrContext, triple: HoareTriple): Promise<FeedbackAlrNode> {
    const nodeInfo = this.makeNodeInfo(context);

    const {solver, result: solverResult } = await checkHoareTriple(this.env, triple);

    return match(solverResult)
      .with('unsat', () =>
        CorrectAttemptFeedbackAlrNode.make(nodeInfo, new Feedback(SAY_CORRECT_MESSAGE))
      )
      .otherwise(() => {
        const model = solver.model();

        const { preState, postState } = computePreAndPostStatesAccordingToCountermodel(triple, this.env, model);

        const feedbackMessage = makeWrongAttemptFeedbackMessage(triple, preState, postState);
        return IncorrectAttemptFeedbackAlrNode.make(nodeInfo, new Feedback(feedbackMessage));
      });
  }
}


// Old stuff for Sequence
// return ["Suppose we start with the variables being set thus.",
//   `${stringifiedModel}`,
//   "Then the precondition",
//   `    ${triple.getPre().getOriginalInput()}\nis satisfied,`,
//   `but the postcondition\n    ${triple.getPost().getOriginalInput()} won't be satisfied after running the command(s).`].join("\n");


/** Variant checker that doesn't allow the trivial precondition {false} */
export class IsLegitHoareTripleAndNoFalsePrecondZ3Checker extends IsLegitHoareTripleZ3Checker implements AnswerChecker<HoareTriple> {
  constructor(nodeInfo: DefaultAlrNodeInfo, protected readonly env: Z3Env) {
    super(nodeInfo, env);
  }

  async check(context: AlrContext, studentAttempt: HoareTriple): Promise<FeedbackAlrNode> {

    // Might want to make this sort of special case handling more modular in the future
    if (studentAttempt.getPre().toString() === "{ false }") {
      return FeedbackAlrNode.make(
        this.makeNodeInfo(context),
        new Feedback(`${SAY_INCORRECT_MESSAGE}\n\nIt's true that you can prove any postcondition from { false }.\n But we aren't allowing it as a precondition here, because we want you to practice applying the rules mechanically`))
    }
    return super.check(context, studentAttempt);
  }
}

/****************************
    Making feedback
    from Z3 model
*****************************/

type ProgramState = {
  [k: string]: Z3.Arith<"main">;
};

function makeWrongAttemptFeedbackMessage(triple: HoareTriple, preState: ProgramState, postState: ProgramState) {
  const preMessage = codeBlock`
    ${SAY_INCORRECT_MESSAGE}
    The precondition does not guarantee that the postcondition will hold after the command(s).

    Suppose we start with the variables being set thus.
        ${stringifyProgramState(preState)}
    Then the precondition
        ${triple.getPre().getOriginalInput()}
    is satisfied.
  `;

  const postMessage = triple.getCommand() instanceof Skip
    ? codeBlock`
        But the postcondition
           ${triple.getPost().getOriginalInput()}
        is not satisfied.
      `
    : codeBlock`
        But after running
            ${triple.getCommand().getOriginalInput()}
        the state of the program will be
            ${stringifyProgramState(postState)}
        and the postcondition
            ${triple.getPost().getOriginalInput()}
        will not be satisfied.
      `;

  return `${preMessage}\n\n${postMessage}`;
}

function stringifyProgramState(state: ProgramState) {
  return Object.entries(state)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, value]) => `    ${key}: ${value}`)
              .join('\n');
}

function computePreAndPostStatesAccordingToCountermodel(triple: HoareTriple, env: Z3Env, model: Z3.Model<"main">) {
  const preVars = triple.getPre().getFormula().getFreeProgramVars();
  const preState = Object.fromEntries(
    preVars.map(v => [v.toString(), model.eval(v.toZ3(env))])
  );

  const postState = match(triple.getCommand())
    .with(P.instanceOf(Assign), () => {
        const [assignVarName, assignRhs] = [(triple.getCommand() as Assign).getVar().toString(), (triple.getCommand() as Assign).getRhs()];

        return {  ...preState,
                  [assignVarName]: model.eval(assignRhs.toZ3(env))
              }})
    .with(P.instanceOf(Skip), () => preState)
    .exhaustive();

  return {preState, postState};
}

/****************************************
            Hoare Logic
    Semantics and core checking logic
 *****************************************/

// TODO: Even if we want to keep checkHoareTriple around,
// the return type needs to be better

/** Helper function: Check triple in a 'goal-directed' way.
 *
 *  I.e., figure out which inference rule is relevant based on the command.
 * Then check if the inference rule was applied correctly.
 *
 * This is its own function to make it easier to test. But maybe that isn't a good idea.
 */
export async function checkHoareTriple(env: Z3Env, triple: HoareTriple): Promise<{solver: Z3.Solver<"main">, result: Z3.CheckSatResult}> {
  const [pre, command, post] = [triple.getPre().getFormula(), triple.getCommand(), triple.getPost().getFormula()];

  return match(command)
    // Right now the limited range of commands means that we can just use `step`.
    // But might want to restructure things if we start using more complicated commands.
    .with(P.instanceOf(Assign), async (_assign) => {

        const reducedPost = step(triple.getPost().getFormula(), triple.getCommand());
        const conjecture = env.z3context.Implies(
                                    pre.toZ3(env),
                                    reducedPost.toZ3(env)
                                    );
        return z3ProveConjecture(env, conjecture);
      })
    // TODO: Sequence has not really been tested properly yet...
    // .with(P.instanceOf(Sequence), async (sequence) => {
    //   const reducedPost: Formula = (sequence.getSubCommands() as Command[])
    //                                 .reduceRight(step, post);
    //   const conjecture = env.z3context.Implies(
    //                               pre.toZ3(env),
    //                               reducedPost.toZ3(env)
    //                               );
    //   return z3ProveConjecture(env, conjecture);
    // })
    .with(P.instanceOf(Skip), async (_skip) => {
      // Consequence rule
      const conjecture = env.z3context.Implies(pre.toZ3(env), post.toZ3(env));
      return z3ProveConjecture(env, conjecture);
    })
    .exhaustive();
}

/** Take a step according to the inference rules for Hoare Logic.
 * TODO: There's some overlap between this and the stuff in checkHoareTriple. Might inline this away once we start wanting to use more complicated commands.
 */
function step(post: Formula, cmd: Command): Formula {
  return match(cmd)
          .with(P.instanceOf(Assign),
                (assign) => post.subst(assign.getVar(), assign.getRhs()))
          // .with(P.instanceOf(Sequence), (sequence) => {
          //   const final: Formula = (sequence.getSubCommands() as Command[])
          //                                  .reduceRight(step, post);
          //   return final;
          // })
          .with(P.instanceOf(Skip), (_skip) => {
            // no-op
            return post;
          })
          .exhaustive();
}

/**********************************
          Constants, utils
***********************************/

// TODO: Refactor -- Using unicode emoji in strings is not the best idea
const SAY_INCORRECT_MESSAGE = "✗ Incorrect!";
const SAY_CORRECT_MESSAGE = "✓ Correct!";

export const parseIntoHoareTriples = naivelySegmentIntoHoareTriples;

/** Segments an array of proof steps corresponding to a 'straight line program' into triples that share AlrNodes in common.
*
* EG:
* ```
* { assertion1 }
* command1
* { assertion2 }
* command2
* { assertion3 }
* ```
*
* will be segmented into
*
* [<assertion1, command1, assertion2>, <assertion2, command2, assertion3>]
*/
function naivelySegmentIntoHoareTriples(nodeInfo: DefaultAlrNodeInfo, proofSteps: CoreProofStepAlrNode[]): HoareTripleAlrNode[] {
  function proofStepsConstituteHoareTriple(window: CoreProofStepAlrNode[]): boolean {
    const [assertion1, cmd, assertion2] = window;
    return hasAssertion(assertion1) && hasAssertion(assertion2) && isCommandAlrNode(cmd);
  }

  const HOARE_TRIPLE_SIZE = 3;

  // Get all potential triples
  const startIdxes = Array.from({length: proofSteps.length - HOARE_TRIPLE_SIZE + 1}, (_v, i) => i);
  const windows    = startIdxes.map(i => proofSteps.slice(i, i + HOARE_TRIPLE_SIZE));
  // console.log(`windows: ${windows.toString()}`);

  // Return the triples that are eligible Hoare triples
  return windows
    .filter(proofStepsConstituteHoareTriple)
    .map(([pre, cmd, post]) =>
      new HoareTripleAlrNode(nodeInfo, pre as HasAssertion & HasFeedback, cmd as CommandAlrNode, post as HasAssertion & HasFeedback)
    );
}


// ------------------------------------------------------
// --------- SUPERSEDED --------------------------------
// ------------------------------------------------------
// export class Z3EqChecker extends NodeInfoManager implements AnswerChecker<string> {
//   #env: Z3Env;
//   #officialAnswer: z3.Bool<"main">;

//   static make(nodeInfo: DefaultAlrNodeInfo, env: Z3Env, officialAnswer: string) {
//     return new Z3EqChecker(nodeInfo, env, Z3EqChecker.parseToAssertion(officialAnswer).toZ3(env));
//   }

//   private constructor(nodeInfo: DefaultAlrNodeInfo, env: Z3Env, officialAnswer: z3.Bool<"main">) {
//     super(nodeInfo);

//     this.#env = env;
//     this.#officialAnswer = officialAnswer;
//   }

//   async prevalidate(context: AlrContext, studentAttempt: string) {
//     const nodeInfo = this.makeNodeInfo(context);

//     try {
//       Z3EqChecker.parseToAssertion(studentAttempt); // Just checking if it parses
//       return new EmptyFeedbackAlrNode(nodeInfo);
//     } catch (e) {
//       const feedbackMessage = match(e)
//         .with(P.instanceOf(RefineLezerParseError), (error) => `Parse error:\n${error.message}`)
//         .otherwise(() => `An unknown error occurred when parsing ${studentAttempt}`);

//       return FeedbackAlrNode.make(nodeInfo, new Feedback(feedbackMessage));
//     }
//   }

//   /** Assumes the student attempt has already been prevalidated */
//   async check(context: AlrContext, studentAttempt: string): Promise<FeedbackAlrNode> {
//     const nodeInfo = this.makeNodeInfo(context);

//     // TODO: Improve the answer checking -- actually implement hoare logic rules...
//     const studentAttemptFormula = Z3EqChecker.parseToAssertion(studentAttempt).toZ3(this.getZ3Env());
//     const conjecture = this.#env.z3context.Eq(studentAttemptFormula, this.#officialAnswer);
//     const solver = new this.#env.z3context.Solver();

//     solver.add(this.#env.z3context.Not(conjecture));
//     const result = await solver.check();

//     return match(result)
//       .with('unsat', () =>
//         CorrectAttemptFeedbackAlrNode.make(nodeInfo, new Feedback(CORRECT_MESSAGE))
//       )
//       .otherwise(() => {
//         const model = solver.model();

//         // This is a simple heuristic. We can add support for more fine-grained settings / configurations for feedback later.
//         const revealingModelWontRevealAnswer = model.decls().length > 1;

//         // TODO: Improve the feedback message -- make it more relevant to the task
//         const feedbackMessage = INCORRECT_MESSAGE;
//         return FeedbackAlrNode.make(nodeInfo, new Feedback(feedbackMessage));
//       });
//   }

//   // helpers

//   protected getZ3Env() {
//     return this.#env;
//   }

//   static parseToAssertion(s: string) {
//     return parseToAssertion(s);
//   }

// }

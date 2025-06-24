import {
  AlrContext,
  PlainStrContentSource,
  DefaultAlrNode,
  FeedbackAlrNode,
  EmptyFeedbackAlrNode,
  isEmptyFeedbackAlrNode,
  StylesOnlyIncorrectAttemptFeedbackAlrNode,
  isCorrectAttemptFeedbackAlrNode,
  hasFeedback
} from '$lib/alr-core/index.ts';
import type {
  AlrId,
  AlrNode,
  ExerciseAlrNode,
  AlrNodeInfo,
  PlainStrContentAlrNode,
  HasFeedback,
  Unsubscriber
} from '$lib/alr-core/index.ts';
import type { Assertion, Command } from '$lib/lang-support/index.ts';
import { parseToAssertion, HoareTriple, Skip } from '$lib/lang-support/index.ts';
import type { Hole, Remark, HoleType } from '$lib/hoare-logic-specific/data/index.ts';
import type { AnswerPrevalidator, ExerciseFeedbackGiver } from '../answer-checker.ts';
import { holeTypeIsAssertionHole } from '../data/index.ts';
import type { CSSClass } from '$lib/utils.ts';

/*************************************************
 ********** HL Proof Exercise Alr Node ***********
 *************************************************/

export class HLProofExerciseAlrNode extends DefaultAlrNode implements ExerciseAlrNode {
  readonly $type: string = 'HLProofExerciseNode';
  protected hlProofStepNodes: Array<AlrId>;
  protected feedbackGiver: ExerciseFeedbackGiver;

  constructor(nodeInfo: AlrNodeInfo, hlProofStepNodes: Array<ProofStepAlrNode>, feedbackGiver: ExerciseFeedbackGiver) {
    super(nodeInfo);
    this.hlProofStepNodes = hlProofStepNodes.map((n) => n.getId());
    this.feedbackGiver = feedbackGiver;
  }

  /** Submit the HL Proof Exercise.
   *
   * Sets off the compound logic, eg the checking of the Hoare triples. */
  async submit(context: AlrContext) {
    // console.log('Submitting the HL Proof Exercise');
    await this.feedbackGiver.giveAndShowFeedback(context, this);
  }

  getFeedbackGiver(_context: AlrContext) {
    return this.feedbackGiver;
  }

  getProofSteps(context: AlrContext) {
    return this.hlProofStepNodes.map((id) => context.get(id) as ProofStepAlrNode);
  }

  getChildren(context: AlrContext) {
    return this.getProofSteps(context);
  }

  map(context: AlrContext, f: <T extends AlrNode>(fContext: AlrContext, node: T) => T): this {
    const currNodes = this.getChildren(context);
    const newStepNodes = currNodes.map(f.bind(null, context)) as ProofStepAlrNode[];
    return new HLProofExerciseAlrNode(this.makeNodeInfo(context), newStepNodes, this.feedbackGiver) as this;
  }
}

/******************************************************
 ******** Scaffolded HL Proof Exercise Alr Node *******
 ******************************************************/

export class ViewOfScaffoldedExerciseAlrNode extends DefaultAlrNode {
  $type: string = 'ViewOfScaffoldedExerciseAlrNode';

  constructor(
    nodeInfo: AlrNodeInfo,
    private scaffoldedExercise: HLScaffoldedProofExerciseAlrNode
  ) {
    super(nodeInfo);
  }

  notifySubmitted(context: AlrContext, submitted: AlrId): void {
    this.scaffoldedExercise.notifySubmitted(context, submitted);
  }

  getChildren(context: AlrContext) {
    return this.scaffoldedExercise.getChildren(context);
  }
}

export class HLScaffoldedProofExerciseAlrNode extends DefaultAlrNode implements ExerciseAlrNode {
  readonly $type: string = 'HLScaffoldedProofExerciseAlrNode';
  private hlProofStepNodes: Array<AlrId>; // where the af nodes are the scaffolded versions
  protected nextHole: Map<AlrId, AlrId | undefined>;
  protected numSubmissions: number = 0;

  constructor(
    nodeInfo: AlrNodeInfo,
    private nonScaffolded: HLProofExerciseAlrNode
  ) {
    super(nodeInfo);

    // Store the proof steps
    const nonScaffoldedProofSteps = this.nonScaffolded.getProofSteps(nodeInfo.context);
    const proofSteps = nonScaffoldedProofSteps.map((n) =>
      isAssertionHoleAndFeedbackAlrNode(n)
        ? new ScaffoldedHoleAndFeedbackAlrNode(nodeInfo, n, new ViewOfScaffoldedExerciseAlrNode(nodeInfo, this))
        : n
    );
    this.hlProofStepNodes = proofSteps.map((n) => n.getId());

    // Initialize the remaining holes for the scaffolding functionality
    // Disable all the holes to begin with
    const afNodes = proofSteps.filter(isScaffoldedAssertionHoleAndFeedbackAlrNode);
    const remainingHoles = afNodes;
    remainingHoles.forEach((node) => {
      node.getHole(nodeInfo.context).disable(nodeInfo.context);
    });

    // Enable the first hole that students should start with
    // In the case of HL proof exercises, the bottommost one
    const holeToStartWith = remainingHoles[remainingHoles.length - 1];
    holeToStartWith.getHole(nodeInfo.context).enable(nodeInfo.context);

    // Set up the next hole map
    const remainingAfHoleIds = remainingHoles.map((n) => n.getId());
    this.nextHole = new Map(remainingAfHoleIds.map((n: AlrId, i: number) => [n, remainingAfHoleIds[i - 1]]));

    // console.log('this.nextHole', this.nextHole);
  }

  async submit(context: AlrContext) {
    // console.log('Submitting the HL Proof Exercise [scaffolded]');
    await this.nonScaffolded.getFeedbackGiver(context).giveAndShowFeedback(context, this);
  }

  private getNextHole(context: AlrContext, lastSubmitted: AlrId) {
    const next = this.nextHole.get(lastSubmitted);
    return next ? (context.get(next) as ScaffoldedAssertionHoleAndFeedbackAlrNode) : undefined;
  }

  notifySubmitted(context: AlrContext, submitted: AlrId) {
    // Allow user to submit exercise by clicking on any of the btns when revising exercise
    const isRevisingExercise = this.numSubmissions > 0;

    // Has the student submitted a response to the last hole?
    // If so, submit the exercise.
    const next = this.getNextHole(context, submitted);
    if (isRevisingExercise || next === undefined) {
      this.numSubmissions++;
      this.submit(context);

      return;
    }

    // Otherwise, enable the next hole.
    next.getHole(context).enable(context);
  }

  getProofSteps(context: AlrContext) {
    return this.hlProofStepNodes.map((id) => context.get(id) as ProofStepAlrNode);
  }

  getChildren(context: AlrContext) {
    return this.getProofSteps(context);
  }

  map(context: AlrContext, f: <T extends AlrNode>(fContext: AlrContext, node: T) => T): this {
    throw new Error('map for HLScaffoldedProofExerciseAlrNode not implemented');
  }
}

/*************************************************
 *********** Hoare Triple Alr Node ***************
 *************************************************/

/** An array of ProofStepAlrNodes will be parsed / segmented into HoareTripleAlrNodes,
 * which are then used as input by the HLProofExerciseZ3Checker and AnswerChecker<HoareTriple>.
 */
export class HoareTripleAlrNode extends DefaultAlrNode {
  $type = 'HoareTripleAlrNode';
  #pre: AlrId;
  #command: AlrId;
  #post: AlrId;

  constructor(
    defaultNodeInfo: AlrNodeInfo,
    pre: HasAssertion & HasFeedback,
    command: CommandAlrNode,
    post: HasAssertion & HasFeedback
  ) {
    super(defaultNodeInfo);

    this.#pre = pre.getId();
    this.#command = command.getId();
    this.#post = post.getId();
  }

  getHoareTriple(context: AlrContext): HoareTriple | undefined {
    const pre = (context.get(this.#pre) as HasAssertion).getAssertion(context);
    const post = (context.get(this.#post) as HasAssertion).getAssertion(context);
    const cmd = (context.get(this.#command) as CommandAlrNode).getCommand();
    if (pre && post) {
      return new HoareTriple(pre, cmd, post);
    }
  }

  /** Convenience wrapper over setFeedback. */
  setEmptyFeedback(context: AlrContext): void {
    const children = this.getChildren(context) as HasFeedback[];
    children.forEach((n) => n.setFeedback(context, new EmptyFeedbackAlrNode(this.makeNodeInfo(context))));
  }

  /**
   * Assumptions:
   * - Any stale feedback on HasFeedback nodes in the triple has already been cleared
   */
  setFeedback(context: AlrContext, feedback: FeedbackAlrNode): void {
    const triple = this.getChildren(context) as HasFeedback[];

    if (isCorrectAttemptFeedbackAlrNode(feedback)) {
      triple.forEach((child) => child.setFeedback(context, feedback));
    } else {
      // Student attempt was incorrect.

      // 2. Make specific kinds of feedback alr nodes for the different kinds of Hoare triple alr nodes
      const inputNodes = triple.filter((n) => hasStudentAttempt(n) && hasFeedback(n)) as (HasStudentAttempt &
        HasFeedback)[];
      const firstInputNode: (HasStudentAttempt & HasFeedback) | undefined = inputNodes[0];

      // Only display the substantive feedback message for the first of the input nodes
      // Would be too confusing otherwise
      const feedbackForFirstOfInputNodes = feedback;
      const feedbackForOtherNodes = new StylesOnlyIncorrectAttemptFeedbackAlrNode(this.makeNodeInfo(context));

      firstInputNode?.setFeedback(context, feedbackForFirstOfInputNodes);
      triple
        .filter((n) => n !== firstInputNode) // Also want the incorrect attempt styles for input nodes that aren't the first
        .forEach((child) => child.setFeedback(context, feedbackForOtherNodes));

      // Make callbacks to clear the feedback once there's input in *any* of the children assertion hole nodes

      // Need an unsubscriber for each of the children input nodes
      let unsubscribers: Unsubscriber[] = [];
      for (const inputNode of inputNodes) {
        const oldInput = inputNode.getStudentAttempt(context);

        /** A callback that clears the feedback when there's new input.
        TODO: Can we make this cleaner and less fragile? **/
        const resetFeedbackOnInput = (context: AlrContext, id: AlrId) => {
          const node = context.get(id) as HasStudentAttempt;
          if (id === inputNode.getId() && node.getStudentAttempt(context) !== oldInput) {
            // The feedback clearing should only happen once per triple
            // MUST unsubscribe before calling this.setEmptyFeedback
            if (unsubscribers) unsubscribers.forEach((unsub) => unsub.unsubscribe());

            // console.log('resetFeedbackOnInput');
            this.setEmptyFeedback(context);
          }
        };
        unsubscribers.push(this.getAlr().subscribe(resetFeedbackOnInput));
      }

      // Scroll to the first child with a student attempt
      // because exercises can be long enough that the feedback might appear off-screen
      inputNodes[0].getContainerElement()?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }

  getChildren(context: AlrContext): Array<AlrNode> {
    return [this.#pre, this.#command, this.#post].map((id) => context.get(id) as AlrNode);
  }
}

/*************************************************
    HasStudentAttempt interface
 *************************************************/

export function hasStudentAttempt(node: AlrNode): node is HasStudentAttempt {
  return 'getStudentAttempt' in node;
}

export interface HasStudentAttempt extends AlrNode {
  getStudentAttempt(context: AlrContext): string;
}

/*************************************************
    Submittable interface
*************************************************/

export function isSubmittable(node: AlrNode): node is Submittable {
  return 'submit' in node && 'can$Submit' in node;
}

export interface Submittable extends AlrNode {
  can$Submit(context: AlrContext): boolean;
  submit(context: AlrContext): Promise<void>;
}

/*************************************************
    HasAssertion interface for HL Alr Nodes
 *************************************************/

export function hasAssertion(node: AlrNode): node is HasAssertion {
  return 'getAssertion' in node;
}

export interface HasAssertion extends AlrNode {
  getAssertion(context: AlrContext): Assertion | undefined;
}

/*************************************************
 ********** Proof Step Alr Nodes *****************
 *************************************************/

export type ProofStepAlrNode = CoreProofStepAlrNode | RemarkAlrNode;

/** I.e., the ones that will end up being checked */
export type CoreProofStepAlrNode =
  | AssertionHoleAndFeedbackAlrNode
  | ScaffoldedAssertionHoleAndFeedbackAlrNode
  | CommandAlrNode
  | GivenAssertionAlrNode;

export function isCoreProofStepAlrNode(node: AlrNode): node is CoreProofStepAlrNode {
  return (
    isAssertionHoleAndFeedbackAlrNode(node) ||
    isScaffoldedAssertionHoleAndFeedbackAlrNode(node) ||
    isCommandAlrNode(node) ||
    isGivenAssertionAlrNode(node)
  );
}

/*************************************************
 ********** HoleAndFeedbackAlrNode ***************
 *************************************************/

// Non scaffolded

export type AssertionHoleAndFeedbackAlrNode = HoleAndFeedbackAlrNode<'AssertionHole'>;

const HOLE_AND_FEEDBACK_ALR_NODE_TYPE_NAME = 'HoleAndFeedbackAlrNode';

export const isSomeKindOfNonScaffoldedHoleAndFeedbackAlrNode = (node: AlrNode): node is HoleAndFeedbackAlrNode<any> =>
  node.$type === HOLE_AND_FEEDBACK_ALR_NODE_TYPE_NAME;

export const isAssertionHoleAndFeedbackAlrNode = (node: AlrNode): node is AssertionHoleAndFeedbackAlrNode => {
  return isSomeKindOfNonScaffoldedHoleAndFeedbackAlrNode(node) && holeTypeIsAssertionHole(node.getHoleType());
};

// Scaffolded

const SCAFFOLDED_HOLE_AND_FEEDBACK_ALR_NODE_TYPE_NAME = 'ScaffoldedHoleAndFeedbackAlrNode';

export type ScaffoldedAssertionHoleAndFeedbackAlrNode = ScaffoldedHoleAndFeedbackAlrNode<'AssertionHole'>;

const isSomeKindOfScaffoldedHoleAndFeedbackAlrNode = (node: AlrNode): node is ScaffoldedHoleAndFeedbackAlrNode<any> => {
  return node.$type === SCAFFOLDED_HOLE_AND_FEEDBACK_ALR_NODE_TYPE_NAME;
};

export const isScaffoldedAssertionHoleAndFeedbackAlrNode = (
  node: AlrNode
): node is ScaffoldedAssertionHoleAndFeedbackAlrNode => {
  return isSomeKindOfScaffoldedHoleAndFeedbackAlrNode(node) && holeTypeIsAssertionHole(node.getHoleType());
};

/**
 * TODO: Improve the name
 *
Oct 3 notes: In Svelte, would create a new component
that contains the optional feedback
and the thing that the feedback's being given on.
Similarly, here, this is meant to be a
container alr node that contains both alr nodes.

JK: Feedback goes next to an Assertion hole, not in it, just as a label goes next to an input box
*/
export class HoleAndFeedbackAlrNode<T extends HoleType>
  extends DefaultAlrNode
  implements HasAssertion, HasFeedback, HasStudentAttempt
{
  readonly $type = HOLE_AND_FEEDBACK_ALR_NODE_TYPE_NAME;
  readonly #holeAlr: AlrId; // of HoleAlr
  readonly #holeType: HoleType;
  readonly #prevalidator: AnswerPrevalidator;

  /*
  Am just setting feedback to EmptyFeedbackAlrNode,
  because I am using EmptyFeedbackAlrNode now / body of feedback alr node can be undefined now
  */
  #feedback: AlrId; // of a FeedbackAlrNode

  /** Prevalidation in the case of the HL exercises is limited to syntactic / non-semantic validation */
  #studentAttemptIsPrevalidated = $state(false);

  protected containerElement?: HTMLElement;

  constructor(
    nodeInfo: AlrNodeInfo,
    hole: HoleAlrNode<T>,
    feedback: FeedbackAlrNode = new EmptyFeedbackAlrNode(nodeInfo)
  ) {
    super(nodeInfo);

    this.#holeAlr = hole.getId();
    this.#holeType = hole.holeType;
    this.#feedback = feedback.getId();
    this.#prevalidator = hole.getHole().getAnswerPrevalidator();
  }

  /*--------------------
      Hole
  ---------------------*/

  getHoleType() {
    return this.#holeType;
  }

  getHole(context: AlrContext): HoleAlrNode<T> {
    return context.get(this.#holeAlr) as HoleAlrNode<T>;
  }

  getStudentAttempt(context: AlrContext) {
    return this.getHole(context).getStudentAttempt(context);
  }

  /*--------------------
    Assertion
  ---------------------*/

  getAssertion(context: AlrContext): Assertion | undefined {
    if (this.#studentAttemptIsPrevalidated) {
      return parseToAssertion(this.getHole(context).getStudentAttempt(context));
    }
  }

  /*--------------------
         Feedback
  ---------------------*/

  getFeedback(context: AlrContext) {
    return context.get(this.#feedback) as FeedbackAlrNode;
  }

  setFeedback(context: AlrContext, feedback: FeedbackAlrNode): void {
    this.#feedback = feedback.getId();
    this.getAlr().publish(context, this.getId());
  }

  /*-------------------------
      Feedback-relevant UI
  ---------------------------*/

  getContainerElement(): HTMLElement | undefined {
    return this.containerElement;
  }

  setContainerElement(containerElement: HTMLElement) {
    this.containerElement = containerElement;
  }

  /*------------------------
    Submission of attempts
  --------------------------*/

  async prevalidateStudentAttempt(context: AlrContext): Promise<FeedbackAlrNode> {
    const studentAttempt = this.getHole(context).getStudentAttempt(context);

    const feedback = await this.#prevalidator.prevalidate(context, studentAttempt);
    this.#studentAttemptIsPrevalidated = isEmptyFeedbackAlrNode(feedback);
    return feedback;
  }

  can$Submit(_context: AlrContext): boolean {
    return this.#studentAttemptIsPrevalidated;
  }

  async submit(_context: AlrContext) {
    // console.log('submit called on HoleAndFeedbackAlrNode');
  }

  /*-------------------------
    Normal Alr Node methods
  ---------------------------*/

  getChildren(context: AlrContext) {
    const children: AlrNode[] = [context.get(this.#holeAlr) as AlrNode];
    if (this.#feedback) {
      children.push(context.get(this.#feedback) as AlrNode);
    }
    return children;
  }

  map(context: AlrContext, f: <T extends AlrNode>(fContext: AlrContext, node: T) => T): this {
    const hole2 = f(context, context.get(this.#holeAlr) as HoleAlrNode<T>);
    const nodeInfo = this.makeNodeInfo(context);

    const transformedChild = this.#feedback && f(context, context.get(this.#feedback) as FeedbackAlrNode);

    const args: ConstructorParameters<typeof HoleAndFeedbackAlrNode> = [nodeInfo, hole2, transformedChild];
    return new HoleAndFeedbackAlrNode(...args) as this;
  }
}

export class ScaffoldedHoleAndFeedbackAlrNode<T extends HoleType>
  extends DefaultAlrNode
  implements HasAssertion, HasFeedback, HasStudentAttempt
{
  $type: string = SCAFFOLDED_HOLE_AND_FEEDBACK_ALR_NODE_TYPE_NAME;

  constructor(
    nodeInfo: AlrNodeInfo,
    /** The underlying non-scaffolded HoleAndFeedbackAlrNode */
    private readonly nonScaffolded: HoleAndFeedbackAlrNode<T>,
    private readonly viewOfExercise: ViewOfScaffoldedExerciseAlrNode
  ) {
    super(nodeInfo);
  }

  getHoleType() {
    return this.nonScaffolded.getHoleType();
  }

  getHole(context: AlrContext): HoleAlrNode<T> {
    return this.nonScaffolded.getHole(context);
  }

  getStudentAttempt(context: AlrContext) {
    return this.nonScaffolded.getStudentAttempt(context);
  }

  getAssertion(context: AlrContext): Assertion | undefined {
    return this.nonScaffolded.getAssertion(context);
  }

  getFeedback(context: AlrContext) {
    return this.nonScaffolded.getFeedback(context);
  }

  setFeedback(context: AlrContext, feedback: FeedbackAlrNode): void {
    this.nonScaffolded.setFeedback(context, feedback);
    this.getAlr().publish(context, this.getId());
  }

  getContainerElement(): HTMLElement | undefined {
    return this.nonScaffolded.getContainerElement();
  }

  setContainerElement(containerElement: HTMLElement) {
    this.nonScaffolded.setContainerElement(containerElement);
  }

  can$Submit(_context: AlrContext) {
    return this.nonScaffolded.can$Submit(_context);
  }

  async prevalidateStudentAttempt(context: AlrContext): Promise<FeedbackAlrNode> {
    return this.nonScaffolded.prevalidateStudentAttempt(context);
  }

  async submit(context: AlrContext) {
    this.viewOfExercise.notifySubmitted(context, this.getId());
    this.nonScaffolded.submit(context);
  }

  getChildren(context: AlrContext): Array<AlrNode> {
    return this.nonScaffolded.getChildren(context);
  }
}

/*************************************************
 ***************** HoleAlrNode *******************
 *************************************************/

const HOLE_ALR_NODE_TYPE_NAME = 'HoleAlrNode';

export const isSomeKindOfHoleAlrNode = (node: AlrNode): node is HoleAlrNode<any> => {
  return node.$type === HOLE_ALR_NODE_TYPE_NAME;
};

export const isAssertionHoleAlrNode = (node: AlrNode): node is HoleAlrNode<'AssertionHole'> =>
  isSomeKindOfHoleAlrNode(node) && node.getHoleType() === 'AssertionHole';

// TODO: Clean this up
export type HoleStyles = 'text-foreground' | 'cursor-not-allowed opacity-50 text-muted-foreground';
export function makeReadonlyHoleStyles(): HoleStyles {
  return 'cursor-not-allowed opacity-50 text-muted-foreground';
}
export function makeEnabledHoleStyles(): HoleStyles {
  return 'text-foreground';
}

export class HoleAlrNode<T extends HoleType> extends DefaultAlrNode implements HasStudentAttempt {
  readonly $type = HOLE_ALR_NODE_TYPE_NAME;
  #hole: Hole<T>;
  #studentAttempt: string = '';
  #shldDisable: boolean = $state(false);
  #styles: HoleStyles = $state('text-foreground');

  constructor(
    nodeInfo: AlrNodeInfo,
    hole: Hole<T>,
    readonly holeType: T
  ) {
    super(nodeInfo);
    this.#hole = hole;
  }

  getHoleType() {
    return this.holeType;
  }

  getHole() {
    return this.#hole;
  }

  /** Get the placeholderPrompt / text that's initially displayed in the blank field */
  getPlaceholderPrompt(): string {
    return this.#hole.getPlaceholderPrompt();
  }

  getStyles(_context: AlrContext): CSSClass {
    return this.#styles;
  }
  /*-------------------------
    Enable / disable hole
  ---------------------------*/

  shouldDisable(_: AlrContext) {
    return this.#shldDisable;
  }

  enable(context: AlrContext) {
    this.#shldDisable = false;
    this.#styles = 'text-foreground';
    this.getAlr().publish(context, this.getId());
  }

  disable(context: AlrContext) {
    this.#shldDisable = true;
    this.#styles = 'cursor-not-allowed opacity-50 text-muted-foreground';
    this.getAlr().publish(context, this.getId());
  }

  // /** Get the official answer */
  // getAnswer(_: AlrContext) {
  //   return this.#hole.getAnswer();
  // }

  /*-------------------------
       Student attempt
  ---------------------------*/

  getStudentAttempt(_: AlrContext) {
    return this.#studentAttempt;
  }

  setStudentAttempt(_: AlrContext, attempt: string): void {
    this.#studentAttempt = attempt;
  }

  /*-------------------------
    Normal Alr Node methods
  ---------------------------*/

  getChildren(_: AlrContext): Array<AlrNode> {
    return [];
  }
}

/*************************************************
 ************* GivenAssertionAlrNode *************
 *************************************************/

const GIVEN_ASSERTION_ALR_NODE_TYPE_NAME = 'GivenAssertionAlrNode';

export const isGivenAssertionAlrNode = (x: AlrNode): x is GivenAssertionAlrNode =>
  x['$type'] === GIVEN_ASSERTION_ALR_NODE_TYPE_NAME;

export class GivenAssertionAlrNode extends DefaultAlrNode implements HasAssertion, HasFeedback {
  readonly $type = GIVEN_ASSERTION_ALR_NODE_TYPE_NAME;
  readonly #givenAssertion: Assertion;
  readonly #body: AlrId; // of a PlainStrContentAlrNode;
  #feedback: AlrId; // of a FeedbackAlrNode
  protected containerElement?: HTMLElement;

  static make(nodeInfo: AlrNodeInfo, givenAssertion: Assertion): GivenAssertionAlrNode {
    return new GivenAssertionAlrNode(
      nodeInfo,
      givenAssertion,
      PlainStrContentSource.toAlr(
        nodeInfo,
        // TODO: Can use toString once we've made the pretty-printing less verbose
        givenAssertion.getOriginalInput()
      )
    );
  }

  private constructor(
    defaultNodeInfo: AlrNodeInfo,
    givenAssertion: Assertion,
    body: PlainStrContentAlrNode,
    feedback: FeedbackAlrNode = new EmptyFeedbackAlrNode(defaultNodeInfo)
  ) {
    super(defaultNodeInfo);
    this.#givenAssertion = givenAssertion;
    this.#body = body.getId();
    this.#feedback = feedback.getId();
  }

  /*-------------------------
          Assertion
  ---------------------------*/

  // TOCHECK: Not sure what the type of the body / the return type of getBody should be (GivenAssertion vs PlainStrContentAlrNode)
  // Arguably this should just return a string content alr node, since all we'lll be done with this in the short term is rendering it
  // and since the convention with `getBody` in the FeedbackGiver codebase seems to be to have getBody return some sort of content alr node (typically MarkdownAlrNode)
  getBody(context: AlrContext) {
    return context.get(this.#body) as PlainStrContentAlrNode;
  }

  getAssertion() {
    return this.#givenAssertion;
  }

  /*-------------------------
          Feedback
  ---------------------------*/

  getFeedback(context: AlrContext) {
    return context.get(this.#feedback) as FeedbackAlrNode;
  }

  setFeedback(context: AlrContext, feedback: FeedbackAlrNode): void {
    this.#feedback = feedback.getId();
    this.getAlr().publish(context, this.getId());
  }

  /*-------------------------
      Feedback-relevant UI
  ---------------------------*/

  getContainerElement(): HTMLElement | undefined {
    return this.containerElement;
  }

  setContainerElement(containerElement: HTMLElement) {
    this.containerElement = containerElement;
  }

  /*-------------------------
    Normal Alr Node methods
  ---------------------------*/

  getChildren(context: AlrContext) {
    return [this.getBody(context)];
  }

  map(context: AlrContext, f: <T extends AlrNode>(fContext: AlrContext, node: T) => T): this {
    return new GivenAssertionAlrNode(
      this.makeNodeInfo(context),
      this.getAssertion(),
      f(context, this.getBody(context))
    ) as this;
  }
}

/*************************************************
 ************* CommandAlrNode ********************
 *************************************************/

const COMMAND_ALR_NODE_TYPE_NAME = 'ImpCommandAlrNode';

export const isCommandAlrNode = (x: AlrNode): x is CommandAlrNode => x['$type'] === COMMAND_ALR_NODE_TYPE_NAME;

export const isSkipCommandAlrNode = (x: AlrNode) => {
  return isCommandAlrNode(x) && (x as CommandAlrNode).getCommand() instanceof Skip;
};

export class CommandAlrNode extends DefaultAlrNode implements HasFeedback {
  readonly $type = COMMAND_ALR_NODE_TYPE_NAME;
  readonly #command: Command;
  readonly #body: AlrId; // of PlainStrContentAlrNode;
  #feedback: AlrId;
  protected containerElement?: HTMLElement;

  static make(nodeInfo: AlrNodeInfo, command: Command): CommandAlrNode {
    return new CommandAlrNode(nodeInfo, command, PlainStrContentSource.toAlr(nodeInfo, command.getOriginalInput()));
  }

  private constructor(
    nodeInfo: AlrNodeInfo,
    command: Command,
    body: PlainStrContentAlrNode,
    feedback: FeedbackAlrNode = new EmptyFeedbackAlrNode(nodeInfo)
  ) {
    super(nodeInfo);
    this.#body = body.getId();
    this.#command = command;
    this.#feedback = feedback.getId();
  }

  /*-------------------------
          Feedback
  ---------------------------*/

  getFeedback(context: AlrContext) {
    return context.get(this.#feedback) as FeedbackAlrNode;
  }

  setFeedback(context: AlrContext, feedback: FeedbackAlrNode): void {
    this.#feedback = feedback.getId();
    this.getAlr().publish(context, this.getId());
  }

  /*-------------------------
      Feedback-relevant UI
  ---------------------------*/

  getContainerElement(): HTMLElement | undefined {
    return this.containerElement;
  }

  setContainerElement(containerElement: HTMLElement) {
    this.containerElement = containerElement;
  }

  /*-------------------------
        Command
  ---------------------------*/

  getCommand() {
    return this.#command;
  }

  getBody(context: AlrContext) {
    return context.get(this.#body) as PlainStrContentAlrNode;
  }

  /*-------------------------
    Normal Alr Node methods
  ---------------------------*/

  getChildren(context: AlrContext) {
    return [this.getBody(context)];
  }

  map(context: AlrContext, f: <T extends AlrNode>(fContext: AlrContext, node: T) => T): this {
    return new CommandAlrNode(this.makeNodeInfo(context), this.getCommand(), f(context, this.getBody(context))) as this;
  }
}

/*************************************************
 ************** RemarkAlrNode ********************
 *************************************************/

const REMARK_ALR_NODE_TYPE_NAME = 'RemarkAlrNode';

export const isRemarkAlrNode = (x: AlrNode): x is RemarkAlrNode => x['$type'] === REMARK_ALR_NODE_TYPE_NAME;

export class RemarkAlrNode extends DefaultAlrNode {
  readonly $type = REMARK_ALR_NODE_TYPE_NAME;
  readonly #remark: Remark;
  readonly #body: AlrId; // of PlainStrContentAlrNode;

  static make(nodeInfo: AlrNodeInfo, remark: Remark): RemarkAlrNode {
    return new RemarkAlrNode(nodeInfo, remark, PlainStrContentSource.toAlr(nodeInfo, remark.getBody()));
  }

  private constructor(nodeInfo: AlrNodeInfo, remark: Remark, body: PlainStrContentAlrNode) {
    super(nodeInfo);
    this.#body = body.getId();
    this.#remark = remark;
  }

  /*-------------------------
        Remark
  ---------------------------*/

  getRemark(): Remark {
    return this.#remark;
  }

  getBody(context: AlrContext): PlainStrContentAlrNode {
    return context.get(this.#body) as PlainStrContentAlrNode;
  }

  /*-------------------------
    Normal Alr Node methods
  ---------------------------*/

  getChildren(context: AlrContext) {
    return [this.getBody(context)];
  }

  map(context: AlrContext, f: <T extends AlrNode>(fContext: AlrContext, node: T) => T): this {
    return new RemarkAlrNode(this.makeNodeInfo(context), this.getRemark(), f(context, this.getBody(context))) as this;
  }
}

import { AlrId, DefaultAlrNode, PlainStrContentSource,
  PlainStrContentAlrNode } from '$lib/alr-core/index.ts';
import type { AlrContext, AlrNode, DefaultAlrNodeInfo } from '$lib/alr-core/index.ts';
import { Feedback } from '$lib/hoare-logic-specific/data/index.ts';
import type {CSSClass} from '$lib/utils.ts';

/*********************************************
          HasFeedback 'typeclass'
**********************************************/

export function hasFeedback(node: AlrNode): node is HasFeedback {
  return 'getFeedback' in node && 'setFeedback' in node;
}

export interface HasFeedback  extends AlrNode {
  getFeedback(context: AlrContext): FeedbackAlrNode;
  setFeedback(context: AlrContext, feedback: FeedbackAlrNode): void;

  getContainerElement(): HTMLElement | undefined;
}


/*********************************************
          Feedback Alr Node
**********************************************/

/** We're simplifying and using the same kind of content alr node for all feedback alr nodes.
 * Using plain strings for now, but am tempted to go for a 'HtmlContentAlrNode' in the future.
 */
type FeedbackBodyAlrNode = PlainStrContentAlrNode;

/** Helper 'base' class. Mostly adapted / copied from the GST codebase. */
export abstract class BaseFeedbackAlrNode extends DefaultAlrNode {
  protected feedback?: Feedback;
  protected body?: AlrId;

  /** Selector for the specific part that the feedback is about. Enables UI like squiggly lines below the specific part of the student's response that's wrong. */
  // #selector: IntervalSelector;

  // Need body in addition to feedback for constructor for `map`
  constructor(nodeInfo: DefaultAlrNodeInfo, feedback?: Feedback, body?: FeedbackBodyAlrNode) {
    super(nodeInfo);
    this.feedback = feedback;
    this.body = body?.getId();
  }

  getFeedback() {
    return this.feedback;
  }

  // Had been tempted to hide what it returns. But callers do need to know whether they're dealing with Markdown (or plain string or whatever)
  getBody(context: AlrContext): FeedbackBodyAlrNode | undefined {
    return this.body && context.get(this.body) as FeedbackBodyAlrNode;
  }

  clearBody() {
    this.body = undefined;
  }

  getChildren(context: AlrContext): AlrNode[] {
    return this.body ? [context.get(this.body) as AlrNode] : [];
  }

  getAttemptStyles(_context: AlrContext): AttemptStyles {
    return new EmptyAttemptStyles();
  }
}

// Oct 3 notes: we do need a separate Feedback class, cos want to distinguish display from data
// And we do NOT want official answer in the feedback class
// Oct 3 notes: simplify: Don't bother with the hierarchal feedback stuff for now. Similarly, don't bother with selectors for now --- easy to add later.

export class FeedbackAlrNode extends BaseFeedbackAlrNode {
  $type = 'FeedbackAlrNode';

  static make(
    nodeInfo: DefaultAlrNodeInfo,
    feedback?: Feedback) {
    const body = feedback ? PlainStrContentSource.toAlr(nodeInfo, feedback.getBody()) : undefined;
    return new FeedbackAlrNode(nodeInfo,
                               feedback,
                               body);
  }

  protected constructor(
    nodeInfo: DefaultAlrNodeInfo,
    feedback?: Feedback,
    body?: FeedbackBodyAlrNode) {
    super(nodeInfo, feedback, body);
  }

  map(context: AlrContext, f: <A extends AlrNode>(fContext: AlrContext, node: A) => A) {
    const newBody = this.getBody(context) && f(context, this.getBody(context) as FeedbackBodyAlrNode);
    const newFeedbackAlr = new FeedbackAlrNode(
      this.makeNodeInfo(context),
      this.feedback,
      newBody
    );
    return newFeedbackAlr as this;
  }
}

/*********************************************
          Empty Feedback
**********************************************/

export function isEmptyFeedbackAlrNode(node: AlrNode): node is EmptyFeedbackAlrNode {
  return node instanceof EmptyFeedbackAlrNode;
}

/** To be used a la the 'null object pattern' */
export class EmptyFeedbackAlrNode extends BaseFeedbackAlrNode {
  $type = 'EmptyFeedbackAlrNode';
  protected feedback = undefined;
  protected body = undefined;
  constructor(nodeInfo: DefaultAlrNodeInfo) {
    super(nodeInfo);
  }
}

/*********************************************
     Attempt is Correct Feedback
**********************************************/

export function isCorrectAttemptFeedbackAlrNode (node: AlrNode): node is CorrectAttemptFeedbackAlrNode {
  return node instanceof CorrectAttemptFeedbackAlrNode;
}

export class CorrectAttemptFeedbackAlrNode extends FeedbackAlrNode {
  $type = "CorrectAttemptFeedbackAlrNode";

  static make(
    nodeInfo: DefaultAlrNodeInfo,
    feedback?: Feedback) {
    const body = feedback ? PlainStrContentSource.toAlr(nodeInfo, feedback.getBody()) : undefined;
    return new CorrectAttemptFeedbackAlrNode(nodeInfo,
                                            feedback,
                                            body);
  }
}

/*********************************************
      Attempt Is Incorrect Feedback
**********************************************/

export function isIncorrectAttemptFeedbackAlrNode (node: AlrNode): node is IncorrectAttemptFeedbackAlrNode {
  return node instanceof IncorrectAttemptFeedbackAlrNode;
}

export class IncorrectAttemptFeedbackAlrNode extends FeedbackAlrNode {
  $type = "IncorrectAttemptFeedbackAlrNode";

  static make(
    nodeInfo: DefaultAlrNodeInfo,
    feedback?: Feedback) {
    const body = feedback ? PlainStrContentSource.toAlr(nodeInfo, feedback.getBody()) : undefined;
    return new IncorrectAttemptFeedbackAlrNode(nodeInfo,
                                            feedback,
                                            body);
  }

  getAttemptStyles(_context: AlrContext): AttemptStyles {
    return new IncorrectAttemptStyles();
  }
}


/* TODO: This would be a nice place for mixins */

/** This is in effect a mixture of an EmptyFeedbackAlrNode and IncorrectAttemptFeedbackAlrNode:
 *
 * It's an IncorrectAttemptFeedbackAlrNode whose body and feedback are `undefined` */
export class IncorrectAttemptOnlyStylesFeedbackAlrNode extends IncorrectAttemptFeedbackAlrNode {
  $type = 'IncorrectAttemptOnlyStylesFeedbackAlrNode';

  protected feedback = undefined;
  protected body = undefined;

  static make(
    nodeInfo: DefaultAlrNodeInfo) {
    return new IncorrectAttemptFeedbackAlrNode(nodeInfo);
  }

  constructor(nodeInfo: DefaultAlrNodeInfo) {
    super(nodeInfo);
  }
}


/*********************************************
        Attempt Styles
**********************************************/

/** Styles for the attempt box (as opposed to, e.g., for the feedback itself), loosely construed.
 *
 * In the context of a HL, this can be styles for each of the Hoare triple nodes.
 */
export interface AttemptStyles {
  getStyles(): CSSClass;
}

export class EmptyAttemptStyles implements AttemptStyles {
  constructor() {}

  getStyles() {
    return "";
  }
}

export class IncorrectAttemptStyles implements AttemptStyles {
  constructor() {}

  getStyles() {
    return "border-l-4 pl-2 border-red-400";
  }
}

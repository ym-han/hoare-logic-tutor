/*****************************************************************************
 Much of this was copied or adapted from
 `feedback-giver/typescript-monorepo/packages/feedbackCore/src/gstCore/internal/core.ts`

The comments mostly just summarize the design doc
(though there are some comments I have copied from the FeedbackGiver codebase).
They're there to check my understanding of what the various structures are meant to be doing.


Notes / questions that were answered
=====================================
  Q: Do we really want to be mutating data within nodes, as in the Markdown nodes in `alrContent.ts`, as opposed to just replacing nodes (that's what, e.g., Lexical does).
    - Ans: should mutate data within node since nodes can be shared between different ALR trees

*****************************************************************************/

import { AlrId } from './id.ts';
export { AlrId };
import { toUpperSnakeCase } from '../../utils.ts';
import unimplemented from 'ts-unimplemented';
import { setContext, getContext } from 'svelte';

/*************************************************
 ***************** Top-level Alr *****************
 *************************************************/

// TODO: Check if `void` return type is OK -- used to be `null`
export type Unsubscriber = { unsubscribe: () => void };

export class Alr {
  /** We can have have multiple ALR roots that share subtrees
   * Eg, "to enable having a teacher who sees his example code and everyone else coding, and also students who only see the teacher's and their own".
   */
  #roots: Map<AlrRootType, AlrNode> = new Map();
  #subscribers: Map<symbol, (context: AlrContext, id: AlrId) => void> = new Map();

  constructor() {}

  getAvailableRootTypes(_: AlrContext): Array<AlrRootType> {
    return Array.from(this.#roots.keys());
  }

  getRoot(_: AlrContext, rootType: AlrRootType): AlrNode | undefined {
    return this.#roots.get(rootType);
  }

  setRoot(_: AlrContext, rootType: AlrRootType, alrNode: AlrNode) {
    this.#roots.set(rootType, alrNode);
  }

  /** Subscribe to get updates when the Alr changes.
   * The displayers will be the ones subscribing.
   * Intended use: tells you what node has changed, so that displayers will reload that node
   *
   * We're sticking with the generic 'subscribe' name for now,
   * because may want to add more events in the future
   *
   * @param callback - Note: We do want to call the callback with AlrIds of everything that changes (discussed Thurs Nov 21)
   */
  subscribe(callback: (_: AlrContext, id: AlrId) => void): Unsubscriber {
    const callbackId = Symbol();
    this.#subscribers.set(callbackId, callback);
    return {
      unsubscribe: () => this.#subscribers.delete(callbackId)
    };
  }

  publish(context: AlrContext, id: AlrId) {
    // must NOT use forEach on pain of running into issues with Safari, at least for me
    for (const callback of this.#subscribers.values()) {
      callback(context, id);
    }
  }
}


/**
 * Examples include: 'StudentView', 'TeacherView'
 * Note: Cannot have multiple roots of the same type -- c.f. `Alr`'s internal representation of roots
 */
export class AlrRootType {
  #id: string;
  constructor(s: string) {
    this.#id = s;
  }

  // [TODO: TOCHECK at some point -- can't remb if we've discussed this specifically]
  // QUESTION: When would we want to use this? (I don't actually see any uses of it in the Feedback Giver codebase.)
  equalsString(s: string) {
    return this.#id === s;
  }

  toString() {
    return this.#id;
  }
}

/**********************************************
 ************** AlrContext  *******************
 **********************************************/

type GlobalConstants = {
  FEEDBACK_DEBOUNCE_MS: number;
}

const defaultGlobalConstants = { FEEDBACK_DEBOUNCE_MS: 300 };

/**
 * Design doc:
 * > The Alr Context defines information about the environment
 * > in which the Alr exists and which is needed in order to perform the correct operations."
 *
 * > All operations on this data structure [presumably the ALR] should go through specialized modification functions (rather than direct pointer manipulation) and should take some kind of opaque context parameter."
 *
 * The application has a single context; the context represents relevant global data.
 *
 * Examples:
 *   -  Context could be used to store whether or not the GST should be version controlled,
 *      so that version control logic won't be coupled with the core Alr data structure.
 *   -  Similarly with access control
 */
export class AlrContext {
  #nodes: Map<AlrId, AlrNode> = new Map();
  readonly #globalConsts: GlobalConstants;

  constructor(globalConstants: GlobalConstants = defaultGlobalConstants) {
    this.#globalConsts = globalConstants;
  }

  get(id: AlrId): AlrNode | undefined {
    return this.#nodes.get(id);
  }

  set(node: AlrNode): void {
    this.#nodes.set(node.getId(), node);
  }

  getGlobalConstants() {
    return this.#globalConsts;
  }
}

/*************************************************
 ***************** Data sources ******************
 *************************************************/

export interface AlrSource<A, B extends AlrNode> {
  toAlr(nodeInfo: DefaultAlrNodeInfo, data: A): B;
}

/*************************************************
 ******************** Nodes **********************
 *************************************************/

export interface AlrNode {
  /** Used to discriminate between different kinds of AlrNodes */
  readonly $type: string;

  /** Comments from original FeedbackGiver codebase:
    * Returns the ordered list child AlrNode's of this node.
    * A AlrNode may have special labeled children,
   but they should be included in the return value of getChildren().

    * Implementation note: AlrNodes should store IDs of children (instead of direct references to them)
     * and then use IDs and the AlrContext to get the children.
   */
  getChildren(context: AlrContext): Array<AlrNode>;


  /** Fmap.
  *
  * How the `this` return type works:
  * > The type of 'this' will follow with subclasses. A subclass sees any 'this' in the type of its base class as its own type
  *
  * The `this` return type seems to do what we want; e.g., compiler will complain if you try to do `return new SomeOtherAlrNode(...) as this`.
  *
  * For more on the `this` return type, see:
  * https://github.com/microsoft/TypeScript/issues/3694
  * and https://github.com/microsoft/TypeScript/pull/6739
  */
  map(context: AlrContext, f: <T extends AlrNode>(ctx: AlrContext, node: T) => T): this;
  // TODO: guarantee returns something of the same type. Timebox this; might just need to assume no mess-ups
  // TODO: (i) Check signature; in particular, that it's OK to add context outside of the `f` too
  //            (ii) Check that the `this` return type is OK / solves the "guarantee returns something of the same type" issue

  getId(): AlrId;

  toString(): string;
}

export interface ExerciseAlrNode {}

// -----------------------------------------------
//            Node Info related
// -----------------------------------------------

export interface DefaultAlrNodeInfo {
  alr: Alr;
  context: AlrContext;
}

export type AlrNodeInfoWithoutContext = Omit<DefaultAlrNodeInfo, 'context'>;

export abstract class NodeInfoManager {
  protected readonly alrInfoWithoutContext: AlrNodeInfoWithoutContext;

  /** Note: Make sure not to actually store the AlrContext in the class. */
  constructor(defaultNodeInfo: DefaultAlrNodeInfo) {
    const { context, ...alrInfoWithoutContext } = defaultNodeInfo;
    this.alrInfoWithoutContext = alrInfoWithoutContext;
  }

  protected makeNodeInfo(context: AlrContext): DefaultAlrNodeInfo {
    return {context, ...this.alrInfoWithoutContext}
  }

  /** This reference to the Alr can be used to publish updates */
  protected getAlr() {
    return this.alrInfoWithoutContext.alr;
  }
}

export abstract class DefaultAlrNode extends NodeInfoManager implements AlrNode {
  abstract readonly $type: string;
  readonly #id: AlrId;

  /** Note: Make sure not to actually store the AlrContext in the class. */
  constructor(defaultNodeInfo: DefaultAlrNodeInfo) {
    super(defaultNodeInfo);
    this.#id = new AlrId();

    defaultNodeInfo.context.set(this); // so that won't ever forget to register node on context.
  }

  abstract getChildren(context: AlrContext): Array<AlrNode>;

  // TODO: Maybe just have
  //   abstract map(context: AlrContext, _f: <T extends AlrNode>(ctx: AlrContext, node: T) => T): this;
  // esp. since I'm not sure I actually get type errors if I don't implement the unimplemented?
  map(context: AlrContext, _f: <T extends AlrNode>(ctx: AlrContext, node: T) => T): this {
    if (this.getChildren(context).length === 0) {
      return this;
    } else {
      return unimplemented();
    }
  }

  getId(): AlrId {
    return this.#id;
  }

  protected getAlr(): Alr {
    return this.alrInfoWithoutContext.alr;
  }

  toString(): string {
    return toUpperSnakeCase(this.$type);
  }
}

/*************************************************
 ****************** Displayers *******************
 *************************************************/

export interface AlrDisplayer {}

export interface DisplayerProps {
  context: AlrContext;
  node:    AlrNode;
}

export interface RootDisplayerProps extends DisplayerProps {
  /** The root displayer will set the `alr` in the Svelte context so that children displayers can also access it */
  alr: Alr;
}

/** The 'Env / 'Config' of our 'reader' for Displayers -- this is what gets set using Svelte's `setContext`
 * TODO Dec6: Check if we should have only the Alr in the svelte context and dispense with this wrapper env
 */
export interface DisplayerInfo {
  getAlr(): Alr;
}

/** The key to be used for DisplayerInfo in a Svelte context */
const displayerInfoKey = 'env';

export function setAlrInSvelteContext(alr: Alr) {
  const env: DisplayerInfo = { getAlr() { return alr; } };
  setContext(displayerInfoKey, env);
}

/** This must be called during component initialization
 * since setContext / getContext must be called during component initialization.
 */
export function getAlrFromSvelteContext() {
  return (getContext(displayerInfoKey) as DisplayerInfo).getAlr();
}

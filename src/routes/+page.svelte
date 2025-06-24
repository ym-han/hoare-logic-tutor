<script lang="ts">
  import { onDestroy } from 'svelte';
  import { AlrContext, Alr, AlrRootType } from '$lib/alr-core/index.ts';
  import {
    HLScaffoldedProofExerciseDisplayer,
    HLProofExerciseDisplayer
  } from '$lib/hoare-logic-specific/displayers/index.ts';
  import {
    HLProofExercise,
    HLProofExerciseDataSource,
    HLScaffoldedProofExercise,
    HLScaffoldedProofExerciseDataSource,
    makeAssertionHole,
    Remark
  } from '$lib/hoare-logic-specific/data/index.ts';
  import {
    IsLegitHoareTripleZ3Checker,
    IsLegitHoareTripleAndNoFalsePrecondZ3Checker,
    HLProofExerciseZ3Checker
  } from '$lib/hoare-logic-specific/answer-checker.ts';
  import { killThreads, parseToAssertion, parseToCommand } from '$lib/lang-support/index.ts';
  import { init } from 'z3-solver';
  import { codeBlock } from 'common-tags';
  import CodeSnippet from '$lib/components/base/code-snippet/code-snippet.svelte';
  import * as Alert from '$lib/components/base/alert/index.js';
  import Blockquote from '$lib/components/base/blockquote/blockquote.svelte';
  import NotaBene from '$lib/components/nota-bene/nota-bene.svelte';
  import Toc from 'svelte-toc';

  const alrContext = new AlrContext();
  const alr = new Alr();
  const defaultNodeInfo = { alr, context: alrContext };

  /***************
      Helpers
  ****************/

  async function getZ3Env() {
    const api = await init();
    return { api, z3context: api.Context('main') };
  }

  onDestroy(async () => {
    const env = await getZ3Env();
    // See https://github.com/search?q=repo%3AZ3Prover%2Fz3%20terminateAllThreads&type=code
    // https://github.com/Z3Prover/z3/issues/6701
    await killThreads(env.api.em);
  });

  /***************
      Exercises
  ****************/
  // Exercise 2 and 3 are 'scaffolded'

  const makeAssnHole = (placeholderPrompt?: string) => makeAssertionHole(defaultNodeInfo, placeholderPrompt);

  /** This is the first exercise -- the ex numbering follows that in the exercise pdf */
  async function getExercise2() {
    const proofSteps = [
      makeAssnHole(),
      parseToCommand('b := 2 - a'),
      makeAssnHole(),
      parseToCommand('c := b * 2'),
      makeAssnHole('# Start here: { .... }'),
      parseToCommand('d := c + 1'),
      parseToAssertion('{ d = 5 }')
    ];
    const exercise = new HLScaffoldedProofExercise(
      new HLProofExercise(
        proofSteps,
        new HLProofExerciseZ3Checker(
          defaultNodeInfo,
          await getZ3Env(),
          new IsLegitHoareTripleAndNoFalsePrecondZ3Checker(defaultNodeInfo, await getZ3Env())
        )
      )
    );

    const exerciseAlr = HLScaffoldedProofExerciseDataSource.toAlr(defaultNodeInfo, exercise);
    alr.setRoot(alrContext, new AlrRootType('EXERCISE_2'), exerciseAlr);

    return exerciseAlr;
  }

  async function getExercise3() {
    const proofSteps = [
      parseToAssertion('{ x > 0 }'),
      // parseToAssertion('{ odd(x) => x > 0 }'), // This is the WP, given the final postcond
      parseToCommand('y := ( x / 2) * 2'),
      makeAssnHole(),
      parseToCommand('z := x - y'),
      // parseToAssertion('{ ( odd(x) => z = 1 ) && ( even(x) => z = 0) }'),
      makeAssnHole('# Start here: { .... }'),
      parseToCommand('a := z * 5 + (1 - z) * 12'),
      parseToAssertion('{ (odd(x) => a = 5) && (even(x) => a = 12) }')
    ];
    const exercise = new HLScaffoldedProofExercise(
      new HLProofExercise(
        proofSteps,
        new HLProofExerciseZ3Checker(
          defaultNodeInfo,
          await getZ3Env(),
          new IsLegitHoareTripleZ3Checker(defaultNodeInfo, await getZ3Env())
        )
      )
    );

    const exerciseAlr = HLScaffoldedProofExerciseDataSource.toAlr(defaultNodeInfo, exercise);
    alr.setRoot(alrContext, new AlrRootType('EXERCISE_3'), exerciseAlr);

    return exerciseAlr;
  }

  /***********************************************
     The following exercises are NON-scaffolded
  ************************************************/

  async function getExercise4() {
    // This is the less tricky version from the self-service course
    const proofSteps = [
      parseToAssertion('{ b > 0 }'),
      // parseToAssertion('{ b > 0 &&\n ( a <= 0 => (2 - 0) / 2 = 1 ) &&\n ( a > 0 => (2 - 0) / 2 = 0 ) }'),
      parseToCommand('d := (2 - (a + 1) / a) / 2'),
      makeAssnHole(),
      parseToCommand('m := d * 2 + (1 - d) * 3'),
      makeAssnHole(),
      parseToCommand('x := b * 2'),
      makeAssnHole(),
      parseToCommand('x := x * 2'),
      makeAssnHole(),
      parseToCommand('x := m * x'),
      makeAssnHole(),
      parseToCommand('x := x + 1'),
      parseToAssertion('{ b > 0 &&\n ( a <= 0 => x = 8*b + 1 ) &&\n ( a > 0 => x = 12*b + 1 ) }')
    ];
    const exercise = new HLProofExercise(proofSteps, new HLProofExerciseZ3Checker(defaultNodeInfo, await getZ3Env()));

    const exerciseAlr = HLProofExerciseDataSource.toAlr(defaultNodeInfo, exercise);
    alr.setRoot(alrContext, new AlrRootType('EXERCISE_4'), exerciseAlr);

    return exerciseAlr;
  }

  async function getVariantOfExercise5() {
    const proofSteps = [
      parseToAssertion('{ b > 0 }'),
      parseToCommand('skip;'),
      parseToAssertion('{ true }'),
      new Remark('(Recall that the consequence rule allows us to strengthen preconditions.)'),
      parseToCommand('x := b * 2'),
      makeAssnHole(),
      parseToCommand('x := x * 2'),
      makeAssnHole(),
      parseToCommand('d := (2 - (a + 1) / a) / 2'),
      // parseToAssertion('{ x = 4*b &&\n ( a <= 0 => d = 1 ) &&\n ( a > 0 => d = 0 ) }'),
      makeAssnHole(),
      parseToCommand('m := d * 2 + (1 - d) * 3'),
      makeAssnHole(),
      parseToCommand('x := m * x'),
      makeAssnHole(),
      parseToCommand('x := x + 1'),
      parseToAssertion('{ ( a <= 0 => x = 8*b + 1) &&\n  ( a > 0 => x = 12*b + 1) }')
    ];
    const exercise = new HLProofExercise(proofSteps, new HLProofExerciseZ3Checker(defaultNodeInfo, await getZ3Env()));

    const exerciseAlr = HLProofExerciseDataSource.toAlr(defaultNodeInfo, exercise);
    alr.setRoot(alrContext, new AlrRootType('EXERCISE_5'), exerciseAlr);

    return exerciseAlr;
  }
</script>

<svelte:head>
  <title>Hoare Logic Tutor</title>
</svelte:head>

<div class="page-grid">
  <header>
    <div>
      <h1 class="text-3xl font-bold leading-tight text-purple-600">Hoare Logic Tutor</h1>
      <p class="tagline text-lg text-gray-600">Mirdin Software Design</p>
    </div>
  </header>

  <!-- <header>
  <h1>Hoare Logic Tutor</h1>
  <p class="tagline">Mirdin Software Design</p>
</header> -->
  <!-- "oklch(0.902 0.063 306.703)"  -->

  <div class="toc -ml-5 font-sans text-sm text-gray-500">
    <Toc
      title=""
      --toc-desktop-max-width="12rem"
      --toc-li-hover-color="oklch(0.558 0.288 302.321)"
      --toc-active-bg="oklch(0.606 0.25 292.717)"
    />
    <!--
    purple 600
    violet 500 -->
  </div>

  <main>
    <!-- TODO: -mt-3 is a hack; need to look into why there's this gap -->
    <div class="exercise-page max-width-wrapper -mt-3">
      <section>
        <h2>Introduction</h2>
        <p>
          Hoare logic lies at the foundation of formally verifying imperative programs. Although verification is rarely
          performed outside of research settings, Hoare logic is still interesting from a software-design perspective
          because it provides a simple way to make the assumptions and guarantees of programs (the "logical layer") more
          concrete, and hence help build intuition for the role of the assumptions and guarantees of programs in
          software design.
        </p>
        <!-- <p>A summary of the grammar of the assertions can be found at the bottom of this page.</p> -->
        <!-- TODO: Maybe add a summary of the Imp assertion grammar? -->
      </section>
      <section>
        <h2>Assertions</h2>
        <p>
          The big leap of working with Hoare triples is to go from just seeing lines of code, to seeing everything that
          must be true between each line of code. Let's use this piece of code as an example:
        </p>
        <CodeSnippet lines={['x = 10;', 'y = 42;', 'z = x + y;']} />
        <p>
          The central object of study in Hoare logic are called <em>assertions</em>, logical facts that must be true at
          a certain point in the program. We typically write assertions in curly braces. So, we can write assertions
          before and after each line above as follows:
        </p>
        <CodeSnippet
          lines={[
            '{ true }',
            'x = 10;',
            '{ x = 10 }',
            'y = 42;',
            '{ x = 10, y = 42 }',
            'z = x + y;',
            '{ x = 10, y = 42, z = 52 }'
          ]}
        />
        <p>Here are a couple things to point out about the assertions:</p>
        <p>
          First, they are written in the language of logic, rather than the language of programming. For instance, the =
          within the assertions is mathematical equality, not the assignment operator in programming. We can replace any
          assertion with anything that's logically equivalent. For instance, for the last assertion, we could also write
          <code>x = 10, z = 52, y = z - x</code>.
        </p>
        <p>
          Second, some terminology: The assertion at the top is the precondition, the facts that must be true before the
          code runs. This guarantees that, after the code runs, the last assertion, or postcondition, must be true. The
          assertions in the middle are intermediate facts.
        </p>
        <p>
          Third, you may be wondering what it means for the precondition to be "true." It means the code may run only if
          "true is true," which is a tautology. This means the code may be run in any context.
        </p>
        <p>
          Conversely, a precondition of <code>false</code> means that the following code may never run. So the following
          program and assertions are valid:
        </p>
        <CodeSnippet lines={['{ false }', 'x = 1;', '{ x = 2 }']} />
        <!-- TODO: This might be a good place to intro the HL PRoof exercise component -->
        <p>This can be read</p>
        <Blockquote>
          If <code>false</code> is true, then, after running the code <code>x = 1</code>, it will be true that
          <code>x = 2</code>.
        </Blockquote>
        <p>
          The ability to prove any postcondition from a precondition of <code>false</code> is important when analyzing if
          statements where the condition is always true (or false).
        </p>
        <p>
          Just from these examples, we can already learn some interesting things. Notice how, even though each line is
          simple, the assertions grow in complexity, reflecting how the current state of the program grows in
          complexity.
        </p>
        <p>
          However, the assertions given above are not the only ones that can be given for that example. As one
          alternative, suppose there is a fourth variable, <code>w</code>, which must be set to <code>27</code> before
          this code runs. Then we can alter the assertions to "remember" the value of <code>w</code>.
        </p>
        <CodeSnippet
          lines={[
            '{ w = 27 }',
            'x = 10;',
            '{ x = 10, w = 27 }',
            'y = 42;',
            '{ x = 10, y = 42, w = 27 }',
            'z = x + y;',
            '{ x = 10, y = 42, z = 52, w = 27 }'
          ]}
        />
        <p>
          Conversely, suppose that, in the code we intend to write after this example code, it is only necessary that
          <code>z > 1</code>, and <code>x</code> and
          <code>y</code> will not be used. Then we can "forget" about
          <code>x</code>
          and
          <code>y</code>, and about the exact value of <code>z</code>.
        </p>

        <CodeSnippet
          lines={['{ true }', 'x = 10;', '{ x > 1 }', 'y = 42;', '{ x > 1, y > 1 }', 'z = x + y;', '{ z > 1 }']}
        />
        <p>
          Notice how, this time, the assertions do not grow in complexity. This corresponds to a programmer needing to
          remember less about this code in order to read whatever comes after it.
        </p>
        <!-- TODO: Add a version of Ex 1 that allows you to change the commands! -->
        <Alert.Root class="my-6 border-purple-600">
          <Alert.Title>Exercise 1</Alert.Title>
          <Alert.Description>
            Conceptual Question: In the latter example, how could we change the code without altering the final
            postcondition? How does the 'forgetting' of assertions correspond to a form of modularity?
          </Alert.Description>
        </Alert.Root>
        <p>
          Clearly, there are infinitely many preconditions and postconditions that can be given to a piece of code. In
          the first example, we could change the precondition <code>true</code> to <code>p = 80</code>, for instance,
          but then forget about <code>p</code> and keep the rest the same. This is clearly extraneous. <code>true</code>
          is the
          <em>weakest precondition</em>
          for the postcondition of <code>{'{ x = 10, y = 42, z = 52 }'}</code>, in that all other preconditions imply
          it. Conversely, starting with a precondition of <code>true</code>, <code>{'{ x = 10, y = 42, z = 52 }'}</code>
          is the
          <em>strongest postcondition</em>, in that it implies all other possible postconditions such as
          <code>z > 1</code>. So, for a given precondition, there is a canonical postcondition, and vice versa. But note
          that, if we only have a program, there is not both a canonical precondition and postcondition. Adding
          <code>w</code>
          to the precondition changes the strongest postcondition, and adding <code>w</code> to the postcondition changes
          the weakest precondition.
        </p>
        <p>
          So, in order to get a canonical weakest precondition, we need both the code and a postcondition. In order to
          get a canonical strongest postcondition, we need both the code and a precondition. We cannot get something
          logical without already having something logical. These assertions are central examples of Level 3 'logical'
          constructs, while the code is the central example of a Level 2 construct. This is another example of a central
          theme of this course: while it can help us infer some things, having Level 2 information alone is never enough
          to reason about the design of a program.
        </p>
        <p>
          Later in this course, we'll see some examples of how to mechanically transform the precondition and
          postcondition into code, showing how the logic is more fundamental than the code, in some sense.
        </p>
        <section>
          <h2>Hoare Triples</h2>
          <p>
            In the last section, we showed lines of code, with assertions between each one. We can think about all the
            lines of code as being combined into a single statement, also called a <em>command</em>, and discarding the
            intermediate assertions. Then what's left is the precondition, command, and postcondition. This triple of a
            precondition, command, and postcondition is called a
            <em>Hoare triple</em>. We write them like this:
          </p>
          <div class="mx-auto my-5 max-w-md font-mono text-xl">
            {'{ P } S { Q }'}
          </div>
          <p>A Hoare triple <code>{'{ P } S { Q }'}</code> should be read</p>
          <Blockquote>
            if <code>P</code> is true, then, after <code>S</code> executes,
            <code>Q</code>
            will be true.
          </Blockquote>
          <p>
            In the remainder of the worksheet, we will give the formal rules for inferring Hoare triples for a simple
            imperative programming language with assignments. This is sufficient to give some intuition for treating the
            logical layer of a program as a concrete entity. Loops and conditionals are explained in the appendix.
            <!-- TODO: Add link! -->
            Hoare logics have also been developed for many more complicated language features, such as concurrency and heap-allocation.
          </p>
          <section>
            <h2>Rules</h2>
          </section>
          <p>
            Like other logical systems, Hoare Logic is defined by a set of <em>inference rules</em>. Inference rules are
            given in the form
          </p>
          <div class="my-5">
            <!-- TODO: Get this formatted in a less fragile way with codeblock -->
            <pre>
      premise1     premise2   ...  premiseN
  -------------------------------------------  (rule-name)
                  conclusion
        </pre>
          </div>
          <p>
            This is read to say: if the premises of the rule hold, then one can deduce that the conclusions hold. For
            example, here's an inference rule for "if the glove doesn't fit, you must acquit":
          </p>
          <div class="my-5">
            <pre>
        the glove doesn't fit
    ---------------------------   glove-acquit
          you must acquit
      </pre>
          </div>
          <p>
            These premises are often in turn proven with other rules. Proofs thus take the form of "derivation trees,"
            like this:
          </p>
          <div class="my-5">
            <pre>{`
    hand size = x        glove size = y        x > y
  -----------------------------------------------------
                      the glove doesn't fit
                    -----------------------
                        you must acquit`}
      </pre>
          </div>
          <p>
            Inference rule notation can take some getting used to. If you want some more exposure, a fun way of getting
            it is from
            <a href="http://logitext.mit.edu/tutorial">Logitext</a>, an interactive tutorial which explains another
            formal system, the sequent calculus.
          </p>
          <section>
            <h3>Substitution</h3>
            <p>
              In the next subsection, we'll explain how to infer Hoare triples for assignments, perhaps the most
              fundamental rule. But first, we'll have to explain substitution.
            </p>
            <p>
              Substitutions are a generalization of the notion of "plugging in for a variable" in mathematics. So, for
              instance, in the expression
            </p>
            <Blockquote><code>E = (1/2)at^2 + vt + x</code></Blockquote>
            <p>
              which you may recognize as the displacement of an object moving at constant acceleration, we can "plug in"
              5 for
              <em>x</em>, and get
            </p>
            <Blockquote><code>(1/2)at^2 + vt + 5</code>.</Blockquote>
            <p>We write this in the notation</p>
            <Blockquote><code>[5/x]E</code></Blockquote>
            <p>
              read as "substitute 5 for <em>x</em> in <em>E</em>," or just "5 for <em>x</em> in <em>E</em>."
            </p>
            <p>Here are some more example substitutions:</p>
            <pre class="my-5">
  [x + 1 / x](x * x - y)         = (x + 1) * (x + 1) - y
      [y / x](z := x)            = (z := y)
      [y / x](z := x; w = z + z) = (z := y; w = z + z)
        </pre>
          </section>
        </section>
        <section>
          <h3>Assignment</h3>
          <p>Now that we've explained substitutions, the rule for assignments is easy to state</p>
          <pre class="my-5">
      {`
    --------------------------------  assign
      { [E/x] P }  x := E  { P }`}
    </pre>
          <p>
            where <code>x := E</code> is notation for assigning the expression <em>E</em> to the variable <em>x</em>.
          </p>
          <p>Here's what the rule means, in prose:</p>
          <Blockquote>
            If you want to end up in a state that satisfies the postcondition
            <em>P</em>
            after running
            <em>x := E</em>, you can achieve that by starting in a state that satisfies the variant of <em>P</em> where
            every occurrence of <em>X</em> in <em>P</em> is replaced by <em>E</em>.
          </Blockquote>
          <p>
            In other words, this gives us a way to
            <em>mechanically compute a precondition from a command and postcondition:</em> we can just substitute the right-hand
            side of the command for every occurrence of the left-hand side in the postcondition.
          </p>
          <p>
            For instance, here's an example of using this rule, using the fact that
            <code>[y/x](x = 5)</code> is <code>(y = 5)</code>:
          </p>
          <pre class="my-5">
      {`
    --------------------------------  assign
      { y = 5 }  x := y  { x = 5 }`}
      </pre>
          <p>
            That is, if you have a postcondition, <code>x = 5</code>, and the command or statement <code>x := y</code>
            ('assign
            <code>y</code>
            to
            <code>x</code>'), you can compute the precondition by substituting the right-hand side of that assignment,
            <code>y</code>, for the left-hand side, <code>x</code>, in the postcondition. That's how we got
            <code>y = 5</code> for the precondition.
          </p>
          <p>Here are a couple more applications:</p>
          <pre class="my-5">
      {`
  -----------------------------------------  assign
    { x + 1 > 0 }  x := x + 1  { x > 0 }`}
      </pre>

          <pre class="my-5">
      {`
------------------------------------------------------------------  assign
 {( x + 1 ) * ( x + 1 ) - y = 25}  x := x + 1  {x * x - y = 25}`}
      </pre>
          <p>
            We've seen how it's simple to compute the precondition given the command and the postcondition: we just do a
            substitution. But, to compute the postcondition from the command and the precondition, it's much harder:
            we'd need to compute an "unsubstitution." So, the version of the rule we've given is primarily appropriate
            for computing preconditions from postconditions.
          </p>
          <NotaBene>
            This assignment rule <strong>cannot</strong> be used to compute the
            <em>post</em>condition from an assignment and
            <em>pre</em>condition.
          </NotaBene>
          <p>
            Before moving on, it's worth pausing to ask yourself the following questions (though you don't have to be
            able to fully answer them).
          </p>
          <Alert.Root class="my-6 border-purple-600">
            <Alert.Title>Conceptual Questions</Alert.Title>
            <Alert.Description>
              <ul>
                <li>
                  What's a concrete example of how trying to use this rule to compute the <em>post</em>condition from an
                  assignment and <em>pre</em>condition would yield the wrong result?
                </li>
                <li>
                  <em>Why</em>, intuitively, might it make sense that we can compute the precondition from an assignment
                  and postcondition by substituting?
                </li>
              </ul>
            </Alert.Description>
          </Alert.Root>
        </section>
        <section>
          <h3>Sequence</h3>
          <p>
            The <code>sequence</code> rule simply chains two Hoare triples together, checking that the postcondition of the
            first matches the precondition of the second.
          </p>
          <pre class="my-5">
      {`
           {P} S {Q}    {Q} T {R}
      --------------------------------  seq
               {P} S; T {R}
      `}
      </pre>
          <p>
            Here is an example of using it in conjunction with the <code>assign</code> rule to verify the program
            <code>x := y; x := x + 1</code>.
          </p>
          <pre class="my-5">
      {`
---------------------------------- assign  ---------------------------------- assign
  {y + 1 > 0}  x := y  {x + 1 > 0}           {x + 1 > 0}  x := x + 1  {x > 0}
------------------------------------------------------------------------------------ seq
                { y + 1 > 0 }  x := y;  x := x + 1  { x > 0 }
      `}
      </pre>
          <p>
            In doing this proof, we had to come up with an assertion which is true between each statement of the
            program. This rule motivates the notation we used in the beginning of this document, where we simply wrote
            an assertion between each line of the program.
          </p>
          <CodeSnippet lines={['{ y + 1 > 0 }', 'x := y', '{ x + 1 > 0 }', 'x := x + 1', '{ x > 0 }']} />
        </section>
        <section>
          <h2>Exercise 2</h2>
          <p>It's time for some interactive exercises.</p>
          <p>Assume all variables are integers. Fill in the assertions.</p>
          <aside class="my-3 text-sm">
            <i>Once you've filled in all the assertions, click the button to submit the exercise.</i>
          </aside>
          <div class="exercise">
            {#await getExercise2()}
              <p>Loading...</p>
            {:then exercise2}
              <HLScaffoldedProofExerciseDisplayer context={alrContext} node={exercise2} {alr} />
            {:catch error}
              <p>Error loading exercise: {error.message}</p>
            {/await}
          </div>
        </section>
        <section>
          <h2>Exercise 3</h2>
          <p>
            We haven't given you any rules other than the ones for straight-line code. But we can still write some
            interesting programs if we use integer division, which we introduce in this exercise.
          </p>
          <p>
            Assume all variables are integers, and all division is integer division (rounds toward 0). Fill in the
            assertions.
          </p>
          <div class="text-sm">
            <p><i>Hint: Turn your intuition off and follow the rules mechanically.</i></p>
            <!-- Add a callout for notation? -->
            <aside>
              Notation: <code>&&</code> is the logical 'and'. <code>=></code> is logical implication.
            </aside>
          </div>
          <div class="exercise">
            {#await getExercise3()}
              <p>Loading...</p>
            {:then exercise3}
              <HLScaffoldedProofExerciseDisplayer context={alrContext} node={exercise3} {alr} />
            {:catch error}
              <p>Error loading exercise: {error.message}</p>
            {/await}
          </div>
        </section>
        <section>
          <h2>Exercise 4: 'Logical' vs. syntactic conditionals</h2>
          <p>
            As before, assume all variables are integers, and all division is integer division (rounds toward 0). Also,
            assume x/0 == 0 for all x.
          </p>
          <ol>
            <li>Fill in the assertions.</li>
            <li>In what sense does the code contain a conditional?</li>
          </ol>
          <p><i>Hints</i></p>
          <div class="text-sm">
            <ul>
              <li>It will help if you start at the end and work backwards.</li>
              <li>
                Think carefully about the expression ( 2 − ( a + 1 ) / a ) / 2 and what it does. Try it on different
                values, and remember that division rounds towards 0, and x/0 == 0.
              </li>
            </ul>
          </div>
          <div class="exercise">
            {#await getExercise4()}
              <p>Loading...</p>
            {:then exercise4}
              <HLProofExerciseDisplayer context={alrContext} node={exercise4} {alr} />
            {:catch error}
              <p>Error loading exercise: {error.message}</p>
            {/await}
          </div>
          <p>
            After you're done with this exercise, please take a moment to look at <a
              href="https://self-service.mirdin.com/products/advanced-software-design-self-service/categories/2152601871/posts/2166537256"
              >the official solution.</a
            > The official solution may be different from your solution because it simplifies each expression. Make sure
            to understand this solution before moving on.
          </p>
        </section>
        <section>
          <h2>Precondition strengthening, postcondition weakening</h2>
          <p>
            As we discussed earlier, there can be many preconditions for the same statement and postcondition. For
            example, for the statement <code>x := x + 1</code> with postcondition <code>x &gt; 0</code>, one possible
            precondition is
            <code>x &gt; -1</code>, but another one is <code>x &gt; -1 && x &lt; 10</code>. We say that
            <code>x &gt; -1</code>
            is the <em>weakest precondition</em>, as it is implied by any other valid precondition. Conversely,
            <code>x &gt; 0</code>
            is the <em>strongest postcondition</em>.
          </p>
          <p>
            The rules we gave above only allow for a single precondition for each statement and postcondition. To get
            others, we need to use the <code>consequence</code> rule, which can strengthen preconditions and weaken postconditions.
          </p>
          <pre class="my-5">
      {`
         P' => P     {P} S {Q}     Q => Q'
      ---------------------------------------  consequence
                     {P'} S {Q'}
      `}
      </pre>
          <p>Here's an example application:</p>
          <pre class="my-5">
  {`
      ( x + 1 > 11 )   =>  ( x + 1 > 10 )
      { x + 1 > 10 } x := x + 1 { x > 10 }
        ( x > 10 )     =>  ( x > 9 )
-----------------------------------------------  consequence
      { x + 1 > 11 } x := x + 1 { x > 9 }
  `}
      </pre>
          <p>
            When we express Hoare logic as assertions between each line of a program, the <code>consequence</code> rule
            lets us modify an assertion using purely logical reasoning, without any intervening code. So a use of the
            <code>consequence</code> rule involves two assertions in a row, where the latter/former is a weakening/strengthening
            of the former/latter. For example:
          </p>
          <!-- TODO: Make this a fully filled out HL exercise instead and invite people to play with it -->
          <CodeSnippet
            lines={[
              '{ true }',
              'x = 10;',
              '{ x = 10 }',
              '{ x > 1 }',
              'y = 42;',
              '{ x > 1, y = 42 }',
              '{ x > 1, y > 1 }',
              'z = x + y;',
              '{ x > 1, y > 1, z = x + y }',
              '{ z > 1 }'
            ]}
          />
          <p>
            Suppose a program consists of two subprograms, A followed by B.
            <strong>
              If the strongest postcondition of A is stronger than the weakest precondition of B, the program has
              modularity
            </strong>, because there are many ways to change A without changing B.
          </p>
        </section>
        <section>
          <h2>Exercise 5: Reordering to simplify</h2>
          <h3>Part 1</h3>
          <p>Revisit the code from Exercise 4 (we've printed it again below):</p>
          <CodeSnippet lines={['{ x > 0 }', 'y := (x / 2) * 2', 'z := x - y', 'a := z * 5 + (1 - z) * 12']} />
          <p>
            Notice how it required you to track a lot of information between some of the intermediate lines. How might
            you be able to reorder the statements to make the code simpler? The precondition and postcondition of the
            code as a whole should remain unchanged.
          </p>
          <p>Note: Doing so can also involve a very subtle use of the consequence rule.</p>
          <p>
            Part 2 of the exercise presents the re-ordering of the code and invites you to fill in the assertions, but
            it's still worth checking
            <a
              href="https://self-service.mirdin.com/products/advanced-software-design-self-service/categories/2152601871/posts/2166537269"
            >
              the official solution to this question
            </a> --- just make sure to actually try filling in the assertions before looking at that part of the video.
          </p>
          <h3>Part 2</h3>
          <p>In this variant of Exercise 5, the code has already been re-ordered. Please fill in the assertions.</p>
          <aside class="text-sm">
            (If you haven't already thought about how to re-order the code, you might want to do that first.)
          </aside>
          <div class="exercise">
            {#await getVariantOfExercise5()}
              <p>Loading...</p>
            {:then exercise5}
              <HLProofExerciseDisplayer context={alrContext} node={exercise5} {alr} />
            {:catch error}
              <p>Error loading exercise: {error.message}</p>
            {/await}
          </div>
          <Alert.Root class="my-6 border-purple-600">
            <Alert.Title>Conceptual Question</Alert.Title>
            <Alert.Description>
              How does this compare with the code from the previous exercise? (Ignore the <code>b &gt; 0</code>
              difference.)
            </Alert.Description>
          </Alert.Root>
        </section>
        <section>
          <h2>Appendix A: Loop Invariants (Optional)</h2>
          <p>
            The challenge of verifying with loops is that a single inference must capture the behavior of the loop, no
            matter how many times the loop runs. The following rule does the trick:
          </p>
          <pre class="my-5">
        {`     { P && B } S { P }
        ------------------------------- while
        { P } while B do S { !B && P }`}
      </pre>
          <p>
            This rule is a bit different than the others in that <em>P</em> appears on both sides of the premise.
            Typically, this <em>P</em> will need to be chosen using the
            <code>consequence</code>
            rule, and this rule gives no guidance how to do so. While using the <code>assignment</code> or
            <code>sequence</code> rules can be quite mechanical, coming up with a loop invariant typically requires more
            creativity, and is among the hardest tasks in verifying programs.
          </p>
          <p>
            <em>P</em> is called a <em>loop invariant</em>, because it must be true at the start of each iteration of
            the loop, as well as after the loop runs.
          </p>
          <p>
            As an example, in this factorial program, the loop has invariant
            <code>fac = i! && i &lt;= n</code>. At the end of the loop, we have
            <code>i = n</code>. This is sufficient to prove that
            <code>fac = n!</code>, so the program correctly computes the factorial, as desired. Note that it is not
            sufficient to merely have <code>fac = i!</code>; then we would not be able to prove that
            <code>i = n</code> at the end of the loop.
          </p>
          <CodeSnippet
            lines={['i := 0', 'fac := 1', 'while 1 < n do', '  i := i + 1', '  fac := fac * i', 'end', '{ fac = n! }']}
          />
          <p>
            If you are familiar with proofs by induction, you may recognize the similarities between a loop invariant
            and an induction hypothesis. For a more thorough explanation of loop invariants, check out the Wikipedia
            articles on loop invariants and Hoare logic. We are also collecting resources to help students
            understand/practice loop invariants at <a
              href="https://docs.google.com/document/d/1nUngjbSlyJQfMfvAaxKfn3aF7IeHi3va5yENWeqlo7k/edit"
              class="uri">https://docs.google.com/document/d/1nUngjbSlyJQfMfvAaxKfn3aF7IeHi3va5yENWeqlo7k/edit</a
            >.
          </p>
          <p>
            As a sidenote, the rule we presented only gives <em>partial correctness</em>, meaning it does not prove
            termination. A loop
            <code>while (true)</code> would have a postcondition of
            <em>false</em>, meaning it never terminates. Consult Wikipedia if you want to learn about termination
            proofs.
          </p>
          <h2>Exercise 6 (Optional)</h2>
          <p>Consider the following code for a sequential search procedure:</p>
          <CodeSnippet
            lines={[
              '{ true }',
              'i := 0',
              '{               }',
              'while i <n && arr[i] != val do',
              '  {               }',
              '    i := i + 1',
              '  {               }',
              'end',
              '{ arr[i] == val || (forall j, (j >= 0 && j < n) => arr[j] != val) }'
            ]}
          />
          <ol>
            <li><em>Prove this sequential search procedure correct by choosing a proper loop invariant.</em></li>
            <li><em>State the loop invariant you chose</em>.</li>
          </ol>
        </section>
        <section>
          <h2>Appendix B: Conditionals</h2>
          <pre class="my-2 pt-1">
{`         { P } S { R }   { Q } T { R }
------------------------------------------------------- if
{ ( B => P ) && ( !B => Q ) } if B then S else T { R }`}
      </pre>
          <p>
            Note that the <code>If</code> rule doubles the size of the precondition, so that a chain of them can cause
            exponential blowup in complexity. This corresponds to how a chain of <code>if</code> statements can have
            exponentially many paths. Being able to forget which path was taken using the <code>consequence</code> rule is
            paramount to making programs with conditionals tractable to reason about.
          </p>
        </section>
        <section>
          <h2>Appendix C: Grammar for Assertions</h2>
          <pre>
      <code>
{codeBlock`
      <assertion>      = "{" <formula> < "," <formula> > "}"

      <command>        = <assign> | "skip" ";"
      <assign>         = <name> ":=" <arithExpr> ";"

      <formula>        = <booleanLiteral>
                        | <predicateApp>
                        | <andExpr>
                        | <orExpr>
                        | <compareExpr>
                        | <negation>
                        | <impliesExpr>
                        | "(" <formula> ")"

      <predicateApp>   = <name> "(" [ <arithExpr> { "," <arithExpr> } ] ")"
      <andExpr>        = <formula> "&&" <formula>
      <orExpr>         = <formula> "||" <formula>
      <impliesExpr>    = <formula> "=>" <formula>
      <compareExpr>    = <arithExpr> <compareOp> <arithExpr>
      <negation>       = ("!" | "¬" | "~") <formula>

      <compareOp>      = "=" | "!=" | "<" | "<=" | ">" | ">="

      <arithExpr>      = <term> { ("+" | "-") <term> }
      <term>           = <factor> { ("*" | "/" | "%") <factor> }
      <factor>         = <unaryExpr> | <number> | <name> | "(" <arithExpr> ")"
      <unaryExpr>      = ("+" | "-") <arithExpr>

      <boolLiteral>    = "true" | "false"
      <name>           = ( [a-zA-Z_] )+
      <number>         = ( [0-9] )+`}
      </code>
    </pre>
        </section>
      </section>
    </div>
  </main>
</div>

<style>
  .page-grid {
    display: grid;
    grid-template-areas:
      'header header'
      'sidebar main'
      'footer footer';
    grid-template-columns: 12rem 1fr;
    gap: 16px;
    max-width: 1200px;
    margin: 0 auto;
  }

  header {
    grid-area: header;
    margin-top: 0.8rem;
    /* border-bottom: 3px solid; */
    /* Center the contents */
    display: grid;
    place-content: center;

    text-align: center;
  }

  .toc {
    grid-area: sidebar;
  }

  main {
    grid-area: main;
    /* border: 3px solid; */
    padding-left: 2px;
    padding-right: 2px;
  }
</style>

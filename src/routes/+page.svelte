<script lang="ts">
	import { onDestroy } from 'svelte';
	import { AlrContext, Alr, AlrRootType } from '$lib/alr-core/index.ts';
	import { HLProofExerciseDisplayer } from '$lib/hoare-logic-specific/displayers/index.ts';
	import {
		HLProofExercise,
		HLProofExerciseDataSource,
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

	const makeAssnHole = () => makeAssertionHole(defaultNodeInfo);

	async function getExercise2() {
		const proofSteps = [
			makeAssnHole(),
			parseToCommand('b := 2 - a'),
			makeAssnHole(),
			parseToCommand('c := b * 2'),
			makeAssnHole(),
			parseToCommand('d := c + 1'),
			parseToAssertion('{ d = 5 }')
		];
		const exercise = new HLProofExercise(
			proofSteps,
			new HLProofExerciseZ3Checker(
				defaultNodeInfo,
				await getZ3Env(),
				new IsLegitHoareTripleAndNoFalsePrecondZ3Checker(defaultNodeInfo, await getZ3Env())
			)
		);

		const exerciseAlr = HLProofExerciseDataSource.toAlr(defaultNodeInfo, exercise);
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
			makeAssnHole(),
			parseToCommand('a := z * 5 + (1 - z) * 12'),
			parseToAssertion('{ (odd(x) => a = 5) && (even(x) => a = 12) }')
		];
		const exercise = new HLProofExercise(
			proofSteps,
			new HLProofExerciseZ3Checker(
				defaultNodeInfo,
				await getZ3Env(),
				new IsLegitHoareTripleZ3Checker(defaultNodeInfo, await getZ3Env())
			)
		);

		const exerciseAlr = HLProofExerciseDataSource.toAlr(defaultNodeInfo, exercise);
		alr.setRoot(alrContext, new AlrRootType('EXERCISE_3'), exerciseAlr);

		return exerciseAlr;
	}

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
			parseToAssertion('{ x = 4*b &&\n ( a <= 0 => d = 1 ) &&\n ( a > 0 => d = 0 ) }'),
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
	<title>(Prototype for Alpha Testing) Hoare Logic Tutor</title>
</svelte:head>
<div class="exercise-page max-width-wrapper">
	<section>
		<h1>Introduction</h1>
		<p>This is a prototype for alpha testing.</p>
		<p>
			The focus is currently on interactive versions of the exercises from the Hoare Logic unit --- that is why the
			following assumes that you either are familiar with the rough ideas from the unit handout / course materials or
			can easily refer back to the materials if needed. But we do plan to add more exposition and make this more
			self-contained down the road.
		</p>
		<!-- TODO: Maybe add a summary of the Imp assertion grammar? -->
	</section>
	<!-- TODO: Add a version of Ex 1 that allows you to change the commands! -->
	<section>
		<h1>Exercise 2 from the unit</h1>
		<p>(We're skipping Exercise 1.)</p>
		<p>Assume all variables are integers.</p>
		<p>Fill in the assertions.</p>
		<aside class="text-sm">
			<i>Once you've filled in all the assertions, click the button to submit the exercise.</i>
		</aside>
		<div class="exercise">
			{#await getExercise2()}
				<p>Loading...</p>
			{:then exercise2}
				<HLProofExerciseDisplayer context={alrContext} node={exercise2} {alr} />
			{:catch error}
				<p>Error loading exercise: {error.message}</p>
			{/await}
		</div>
	</section>
	<section>
		<h1>Exercise 3</h1>
		<p>
			We haven't given you any rules other than the ones for straight-line code. But we can still write some interesting
			programs if we use integer division, which we introduce in this exercise.
		</p>
		<p>Assume all variables are integers, and all division is integer division (rounds toward 0).</p>
		<p>Fill in the assertions.</p>
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
				<HLProofExerciseDisplayer context={alrContext} node={exercise3} {alr} />
			{:catch error}
				<p>Error loading exercise: {error.message}</p>
			{/await}
		</div>
	</section>
	<section>
		<h1>Exercise 4: 'Logical' vs. syntactic conditionals</h1>
		<p>
			As before, assume all variables are integers, and all division is integer division (rounds toward 0). Also, assume
			x/0 == 0 for all x.
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
					Think carefully about the expression ( 2 − ( a + 1 ) / a ) / 2 and what it does. Try it on different values,
					and remember that division rounds towards 0, and x/0 == 0.
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
	</section>
	<section>
		<h1>Variant of Exercise 5: Reordering the statements to simplify the code</h1>
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
		<p>
			How does this compare with the code from the previous exercise? (Ignore the <code>b > 0</code>
			difference.)
		</p>
	</section>
</div>

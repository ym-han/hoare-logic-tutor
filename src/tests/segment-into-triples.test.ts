import { describe, it, expect, beforeAll } from 'vitest';
import { parseToAssertion, parseToCommand } from '$lib/lang-support/index.ts';
import { AlrContext, Alr, type DefaultAlrNodeInfo } from '$lib/alr-core/index.ts';
import {
  HLProofExercise,
  HLProofExerciseDataSource,
  makeAssertionHole
} from '$lib/hoare-logic-specific/data/index.ts';

import {parseIntoHoareTriples, DummyExerciseFeedbackGiver} from "$lib/hoare-logic-specific/answer-checker.ts";
import { isCoreProofStepAlrNode } from '$lib/hoare-logic-specific/alr/alr-hl-proof-exercise.svelte.ts';

let nodeInfo: DefaultAlrNodeInfo;

beforeAll(() => {
  const alrContext = new AlrContext();
  const alr = new Alr();
  nodeInfo = { alr, context: alrContext };
})

describe('parse into triples -- length', () => {
  it('most basic x skip', () => {

    const proofSteps = [
      parseToAssertion('{ b > 0 }'),
      parseToCommand("skip;"),
      parseToAssertion('{ b > 0 &&\n ( a <= 0 => (2 - 0) / 2 = 1 ) &&\n ( a > 0 => (2 - 0) / 2 = 0 ) }')
    ];

    const exerciseAlr = HLProofExerciseDataSource.toAlr(nodeInfo, new HLProofExercise(proofSteps, new DummyExerciseFeedbackGiver()));

    // console.log(`getProofSteps: ${exerciseAlr.getProofSteps(nodeInfo.context).length}`);
    const htNodes = parseIntoHoareTriples(nodeInfo, exerciseAlr.getProofSteps(nodeInfo.context).filter(isCoreProofStepAlrNode));

    expect(htNodes.length).toBe(1);
    expect(htNodes[0]?.getHoareTriple(nodeInfo.context)?.getCommand().toString()).toBe(parseToCommand("skip;").toString());
  });

  it('basic x skip x assertion hole', () => {

    const proofSteps = [
      parseToAssertion('{ b > 0 }'),
      parseToCommand("skip;"),
      parseToAssertion('{ b > 0 &&\n ( a <= 0 => (2 - 0) / 2 = 1 ) &&\n ( a > 0 => (2 - 0) / 2 = 0 ) }'),
      parseToCommand('d := (2 - (a + 1) / a) / 2'),
      makeAssertionHole(nodeInfo)
    ]

    const exerciseAlr = HLProofExerciseDataSource.toAlr(nodeInfo, new HLProofExercise(proofSteps, new DummyExerciseFeedbackGiver()));

    const htNodes = parseIntoHoareTriples(nodeInfo, exerciseAlr.getProofSteps(nodeInfo.context).filter(isCoreProofStepAlrNode));

    expect(htNodes.length).toBe(2);
  });
})

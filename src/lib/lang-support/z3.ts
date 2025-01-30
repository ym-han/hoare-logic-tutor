import { init } from 'z3-solver';
import * as Z3 from 'z3-solver';

/*
Related stuff: See `./impAssertionAST.ts` for how we get from an Imp Assertion to a Z3 formula.
*/

export interface Z3Env {
  /** Need api for the `em` for clean up */
  api: Awaited<ReturnType<typeof init>>;
  /** z3context seems to be needed as well for me
  (i.e., want to use the same context object across z3 formulas),
  at least when running on node,
  on pain of getting a 'context mismatch' error
  (even when the z3contexts are created from the same z3Api)*/
  z3context: Z3.Context<"main">;
}

/** Useful util.
 *
 * TODO: Improve the interface. Have the return type be something like IsTheorem | IsNotTheorem
 *
*/
export async function z3ProveConjecture(env: Z3Env, conjecture: Z3.Bool<"main">) {
  const solver = new env.z3context.Solver();
  solver.add(env.z3context.Not(conjecture));
  const result = await solver.check();
  return {solver, result};
}

/************************************************************
  Stuff for cleaning up Z3 infra / releasing resources,
  from https://github.com/Z3Prover/z3/blob/e6feb8423a397da44eb352402a3d26f70489f1e9/src/api/js/src/jest.ts#L50
*************************************************************/

export function killThreads(em: any): Promise<void> {
  em.PThread.terminateAllThreads();

  // Create a polling lock to wait for threads to return
  // TODO(ritave): Threads should be killed automatically, or there should be a better way to wait for them
  const lockPromise = waitWhile(() => !em.PThread.unusedWorkers.length && !em.PThread.runningWorkers.length);
  const delayPromise = delay(5000, new Error('Waiting for threads to be killed timed out'));

  return Promise.race([lockPromise, delayPromise]).finally(() => {
    lockPromise.cancel();
    delayPromise.cancel();
  });
}

/**********************************
 Helper functions for killThreads
***********************************/

 function delay(ms: number): Promise<void> & { cancel(): void };
function delay(ms: number, result: Error): Promise<never> & { cancel(): void };
function delay<T>(ms: number, result: T): Promise<T> & { cancel(): void };
function delay<T>(ms: number, result?: T | Error): Promise<T | void> & { cancel(): void } {
  let handle: any;
  const promise = new Promise<void | T>(
    (resolve, reject) =>
      (handle = setTimeout(() => {
        if (result instanceof Error) {
          reject(result);
        } else if (result !== undefined) {
          resolve(result);
        }
        resolve();
      }, ms)),
  );
  return { ...promise, cancel: () => clearTimeout(handle) };
}

function waitWhile(premise: () => boolean, pollMs: number = 100): Promise<void> & { cancel(): void } {
  let handle: any;
  const promise = new Promise<void>(resolve => {
    handle = setInterval(() => {
      if (premise()) {
        clearTimeout(handle);
        resolve();
      }
    }, pollMs);
  });
  return { ...promise, cancel: () => clearInterval(handle) };
}

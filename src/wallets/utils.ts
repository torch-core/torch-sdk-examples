import { beginCell, Cell, external, storeMessage } from '@ton/core';

export const getMsgHash = (dest: string, body: Cell) => {
  const externalMsg = beginCell()
    .store(
      storeMessage(
        external({
          to: dest,
          body,
        })
      )
    )
    .endCell();

  return externalMsg.hash().toString('hex');
};

export type AsyncLambda<T> = () => Promise<T>;
export type DummyFunction = () => { ok: boolean; value: any };

type RetryParams = {
  attempts?: number;
  attemptInterval?: number;
  verbose?: boolean;
  on_fail?: DummyFunction | (() => void);
};

const DUMMY_FUNCTION_INSTANCE: DummyFunction = () => ({
  ok: false,
  value: null,
});

const DEFAULT_RETRY_PARAMS: Required<RetryParams> = {
  attempts: 3,
  attemptInterval: 3000,
  verbose: false,
  on_fail: DUMMY_FUNCTION_INSTANCE,
};

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Conditional return type based on success or failure
export type RetryResult<T> =
  | { ok: true; value: T }
  | { ok: false; value: null };

/**
 * Tries to run specified lambda several times if it throws
 * @type T - Type of the return value
 * @param lambda - Lambda function to execute
 * @param params - Retry parameters: attempts, attemptInterval, verbose, on_fail
 * @returns Result object with `ok` indicating success and `value` holding the return value
 */
export async function retry<T>(
  lambda: AsyncLambda<T>,
  params: RetryParams = {}
): Promise<RetryResult<T>> {
  const { attempts, attemptInterval, verbose, on_fail } = {
    ...DEFAULT_RETRY_PARAMS,
    ...params,
  };

  let value: T | null = null;
  let ok = false;

  for (let n = attempts; n > 0; n--) {
    try {
      value = await lambda();
      ok = true;
      break; // Exit loop on success
    } catch (error: any) {
      if (typeof on_fail === 'function') {
        on_fail();
      }

      if (verbose) {
        console.error('Retry Error:', error, `\n[Retries left: ${n - 1}]`);
      }
      if (n > 1) await sleep(attemptInterval); // Avoid sleeping after the last attempt
    }
  }

  if (ok) {
    return { ok, value: value as T }; // `value` is guaranteed to be `T` if `ok` is true
  } else {
    return { ok, value: null }; // `value` is null if `ok` is false
  }
}

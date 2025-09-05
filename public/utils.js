/**
 * Polyfill for `Promise.withResolvers()`
 * @template T
 * @return {{
 *   resolve: (value: T | PromiseLike<T>) => void,
 *   reject: (reason?: unknown) => void,
 *   promise: Promise<T>
 * }}
 */
export function withResolvers() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  // @ts-expect-error I know, I know
  return { resolve, reject, promise };
}

// For syntax highlighting
export const html = String.raw;

/**
 * @param {number} ms
 * @return {Promise<void>}
 */
export const sleep = ms => new Promise(res => setTimeout(res, ms));

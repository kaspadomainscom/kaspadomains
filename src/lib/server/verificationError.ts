/**
 * The error every verification path throws, in its own dependency-free module.
 *
 * It used to live in `verifyRequest.ts`, which loads `kaspa-wasm` at module
 * scope. That made anything importing it — `paymentIntent`, `verifyPayment`,
 * `rpcError` — pull a WASM module in too, and the test runner cannot load those,
 * so the entire money path was untestable because of where one four-line class
 * happened to sit.
 *
 * `verifyRequest` still re-exports it, so the API routes' existing imports keep
 * working and there is one definition rather than two.
 */
export class VerificationError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'VerificationError';
  }
}

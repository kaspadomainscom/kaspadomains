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
  /**
   * Whether trying the **same request again**, unchanged, could succeed.
   *
   * This exists because the fee is paid before the write, so "try again" is not
   * advice the client can act on by itself — re-running the flow would pay a
   * second time. The client retries the already-paid request only when the
   * server says the failure was transient, so this flag is the difference
   * between waiting a few seconds and being charged 200 KAS twice.
   *
   * It is set at the throw site rather than inferred from the status, because
   * the same status means both things: a 409 is "not accepted by the network
   * yet" (wait) and also "your intent expired" (start over).
   */
  readonly retryable: boolean;

  /**
   * The database's own error code, where the failure came from one of the
   * atomic write functions. The client uses it to recognise the two outcomes
   * that mean "your earlier attempt actually succeeded"; matching on message
   * text would break the moment the copy changed.
   */
  readonly code?: string;

  constructor(
    message: string,
    readonly status: number,
    options: { retryable?: boolean; code?: string } = {}
  ) {
    super(message);
    this.name = 'VerificationError';
    this.retryable = options.retryable ?? false;
    this.code = options.code;
  }
}

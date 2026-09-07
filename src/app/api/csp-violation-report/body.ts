/**
 * Read an untrusted request body without buffering more than the endpoint's
 * byte budget. A Content-Length header is advisory; chunked requests can omit
 * it, so the stream itself must be bounded before decoding or parsing.
 */
export async function readLimitedBody(
  request: Request,
  maxBytes: number
): Promise<string | null> {
  if (!request.body) return '';

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}


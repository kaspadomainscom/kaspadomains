// src/app/api/domains/[name]/vote/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseAdminClient, isSupabaseWritable } from '@/lib/supabase';
import { verifySignedRequest, VerificationError, extractPayload } from '@/lib/server/verifyRequest';
import { verifyPayment } from '@/lib/server/verifyPayment';
import { rpcError } from '@/lib/server/rpcError';
import { verifyPaymentIntent } from '@/lib/server/paymentIntent';
import { VOTE_FEE_SOMPI } from '@/lib/fees';

export const runtime = 'nodejs';

/**
 * Cast a vote.
 *
 * Replaces `DomainVotesManager.voteDomainByHash`. The contract enforced one
 * vote per wallet and took 6 KAS for it; here the unique constraint on
 * (domain_id, voter) enforces the first, and nothing collects the second --
 * voting is currently free. See docs/GAPS.md.
 *
 * Unlike listing, a voter has no ownership claim to prove, so the EVM
 * signature is the whole check: it proves the vote came from the wallet it
 * is recorded against, which is what stops one person stuffing the ballot
 * with addresses they do not control.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ name: string }> }
) {
  if (!isSupabaseWritable) {
    return NextResponse.json({ error: 'Voting is temporarily unavailable.' }, { status: 503 });
  }

  const { name } = await context.params;

  let body: {
    publicKey?: string;
    issuedAt?: number;
    signature?: string;
    paymentTxId?: string;
    intent?: string;
  };
  try {
    const parsed: unknown = await request.json();
    // JSON `null`, `[1,2]` and `"x"` all parse without throwing, and every field
    // read after this assumes an object -- so without this check they produce a
    // TypeError and a 500 on an unauthenticated request. The links and
    // categories routes already had it; these three did not.
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return NextResponse.json({ error: 'Expected a JSON object.' }, { status: 400 });
    }
    body = parsed as typeof body;
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  let verified;
  try {
    verified = await verifySignedRequest({
      action: 'vote',
      domain: decodeURIComponent(name),
      publicKey: String(body.publicKey ?? ''),
      issuedAt: Number(body.issuedAt ?? 0),
      signature: String(body.signature ?? ''),
      payload: extractPayload(body as Record<string, unknown>),
    });
  } catch (error) {
    if (error instanceof VerificationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  // Required, not advisory: the preflight is what confirms the domain exists and
  // that this wallet has not already voted, and both of those used to be
  // discovered only after the 1 KAS had left the wallet.
  try {
    verifyPaymentIntent(String(body.intent ?? ''), {
      action: 'vote',
      domain: verified.domain,
      signer: verified.signerAddress,
      amountSompi: VOTE_FEE_SOMPI.toString(),
    });
  } catch (error) {
    if (error instanceof VerificationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  let payment;
  try {
    payment = await verifyPayment({
      txId: String(body.paymentTxId ?? ''),
      requiredSompi: VOTE_FEE_SOMPI,
      payerAddress: verified.signerAddress,
    });
  } catch (error) {
    if (error instanceof VerificationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const supabase = getSupabaseAdminClient();

  // One transactional call. Previously this looked the domain up, claimed the
  // receipt, inserted the vote and counted the votes as four separate requests,
  // releasing the receipt by hand if the insert failed. `record_vote` does the
  // claim, the insert and the count inside one Postgres transaction, so the
  // 1 KAS is consumed if and only if the vote exists.
  const { data: votes, error: rpcFailure } = await supabase.rpc('record_vote', {
    p_name: verified.domain,
    p_voter: verified.signerAddress,
    p_fee_paid: payment.paidSompi.toString(),
    p_payment_tx_id: payment.txId,
  });

  if (rpcFailure) {
    const mapped = rpcError(rpcFailure, 'Could not record the vote.');
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  return NextResponse.json({ votes: Number(votes ?? 0) }, { status: 201 });
}

// src/app/api/domains/[name]/vote/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseAdminClient, isSupabaseWritable } from '@/lib/supabase';
import { verifySignedRequest, VerificationError, extractPayload } from '@/lib/server/verifyRequest';
import { verifyPayment } from '@/lib/server/verifyPayment';
import { claimReceipt, releaseReceipt } from '@/lib/server/claimReceipt';
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
    body = await request.json();
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

  const { data: domain, error: lookupError } = await supabase
    .from('domains')
    .select('id')
    .eq('name', verified.domain)
    .maybeSingle();

  if (lookupError) {
    console.error('Vote lookup failed:', lookupError);
    return NextResponse.json({ error: 'Could not record the vote.' }, { status: 500 });
  }
  if (!domain) {
    return NextResponse.json({ error: 'That domain is not listed.' }, { status: 404 });
  }

  // Global claim first: without it a 200 KAS listing receipt would also clear
  // the 1 KAS vote threshold and could be spent a second time here.
  try {
    await claimReceipt(supabase, payment, 'vote', verified.signerAddress);
  } catch (error) {
    if (error instanceof VerificationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const { error: voteError } = await supabase
    .from('votes')
    .insert({
      domain_id: domain.id,
      voter: verified.signerAddress,
      fee_paid: payment.paidSompi.toString(),
      payment_tx_id: payment.txId,
    });

  if (voteError) {
    // The vote was not recorded, so return the receipt for reuse.
    await releaseReceipt(supabase, payment.txId);

    if (voteError.code === '23505') {
      // Two constraints, two very different meanings — see the listing route.
      const detail = `${voteError.message} ${voteError.details ?? ''}`;
      if (detail.includes('payment_tx_id')) {
        return NextResponse.json(
          { error: 'That payment has already been used for another vote.' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'This wallet has already voted for that domain.' },
        { status: 409 }
      );
    }
    console.error('Failed to insert vote:', voteError);
    return NextResponse.json({ error: 'Could not record the vote.' }, { status: 500 });
  }

  const { count } = await supabase
    .from('votes')
    .select('id', { count: 'exact', head: true })
    .eq('domain_id', domain.id);

  return NextResponse.json({ votes: count ?? 0 }, { status: 201 });
}

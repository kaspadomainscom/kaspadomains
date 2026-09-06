import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const runtime = require('./kaspaDomainRuntime.ts') as {
  getL1CovenantStatus?: () => unknown;
  isL1CovenantOperational?: () => boolean;
  KNS_NETWORK?: string;
  LEGACY_KASPLEX_TESTNET?: { chainId: number; chainName: string };
  knsApiUrl?: (path: string) => URL;
  kaspaTransactionUrl?: (transactionId: string) => URL;
  resolveDirectorySource?: (configured: boolean) => string;
  getKnsSignatureScope?: () => string;
};

test('keeps the testnet covenant target separate from current mainnet authority', () => {
  // Defect this protects: treating an undeployed testnet covenant as the
  // authority for KNS ownership, fee payments, or transaction broadcasts.
  assert.deepEqual(runtime.getL1CovenantStatus?.(), {
    network: 'testnet-10',
    deployment: 'not-built',
    broadcastEnabled: false,
    authoritative: false,
  });
  assert.equal(runtime.KNS_NETWORK, 'mainnet');
  assert.equal(
    runtime.knsApiUrl?.('/assets').toString(),
    'https://api.knsdomains.org/mainnet/api/v1/assets'
  );
  assert.equal(
    runtime.kaspaTransactionUrl?.('abc123').toString(),
    'https://api.kaspa.org/transactions/abc123'
  );
  assert.deepEqual(runtime.LEGACY_KASPLEX_TESTNET, {
    chainId: 167012,
    chainHexId: '0x28d84',
    chainName: 'Kasplex Testnet',
    rpcUrl: 'https://rpc.kasplextest.xyz',
    explorerUrl: 'https://frontend.kasplextest.xyz',
    nativeCurrency: { name: 'Kaspa', symbol: 'KAS', decimals: 18 },
  });
  const covenant = runtime.getL1CovenantStatus?.() as { network?: string } | undefined;
  assert.notEqual(runtime.LEGACY_KASPLEX_TESTNET?.chainName, covenant?.network);
});

test('keeps the covenant unavailable even when the directory database is configured', () => {
  // Defect this protects: using Supabase configuration as evidence that an L1
  // covenant exists or is ready to receive/broadcast a transaction.
  assert.equal(runtime.isL1CovenantOperational?.(), false);
  assert.equal(runtime.resolveDirectorySource?.(true), 'supabase');
  assert.equal(runtime.resolveDirectorySource?.(false), 'kasplex-contracts');
});

test('exports the current KNS network as a signed-request scope', () => {
  // Defect this protects: a future environment switch reusing a signature that
  // was obtained under a different KNS ownership network.
  assert.equal(runtime.getKnsSignatureScope?.(), 'knsNetwork: mainnet');
});

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const wallet = require('./useKaswareWallet.ts') as {
  getRememberedKaswareAccount?: (provider: {
    getAccounts(): Promise<string[]>;
    requestAccounts(): Promise<string[]>;
  }) => Promise<string | null>;
};

test('restores a remembered account without requesting wallet permission', async () => {
  // Defect this protects: a page-load reconnect calling requestAccounts(), which
  // opens an approval prompt despite the user taking no explicit action.
  let getCalls = 0;
  let requestCalls = 0;

  const account = await wallet.getRememberedKaswareAccount?.({
    async getAccounts() {
      getCalls += 1;
      return ['kaspa:remembered'];
    },
    async requestAccounts() {
      requestCalls += 1;
      throw new Error('Must not request permission during silent reconnect');
    },
  });

  assert.equal(account, 'kaspa:remembered');
  assert.equal(getCalls, 1);
  assert.equal(requestCalls, 0);
});

test('reports no restored account when the wallet has not granted access', async () => {
  const account = await wallet.getRememberedKaswareAccount?.({
    async getAccounts() {
      return [];
    },
    async requestAccounts() {
      throw new Error('Must not request permission during silent reconnect');
    },
  });

  assert.equal(account, null);
});

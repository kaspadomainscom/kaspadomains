import { contracts } from '@/lib/contracts';
import { getWalletClient } from '@/lib/walletClient';

export async function likeDomain(domain: string, valueInKAS: number) {
  const value = BigInt(valueInKAS * 1e18);

  // Get a generic wallet client (no account specified)
  const genericWalletClient = getWalletClient(undefined);
  const accounts = await genericWalletClient.getAddresses();
  if (!accounts || accounts.length === 0) {
    throw new Error('No connected account');
  }
  // Type assert account to `0x${string}` for typings
  const account = accounts[0] as `0x${string}`;

  // Create a wallet client bound to the specific account
  const walletClient = getWalletClient(account);

  return walletClient.writeContract({
    address: contracts.DomainLikesManager.address,
    abi: contracts.DomainLikesManager.abi,
    functionName: 'likeDomain',
    args: [domain],
    value,
    account,
  });
}

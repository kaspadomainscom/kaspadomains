// lib/contracts.ts
import KaspaDomainsRegistryABI from '@/abis/KaspaDomainsRegistry.json';
import DomainLinksStorageABI from '@/abis/DomainLinksStorage.json';
import DomainDataStorageABI from '@/abis/DomainDataStorage.json';
import DomainCategoriesStorageABI from '@/abis/DomainCategoriesStorage.json';
import DomainVotesManagerABI from '@/abis/DomainVotesManager.json';
import KDCTokenABI from '@/abis/KDCToken.json';
import KaspaDomainsEcosystemFund from '@/abis/KaspadomainsFund.json';
import DemoKNSABI from '@/abis/DemoKNS.json';
import { Abi } from 'viem';

export const contracts = {
  DemoKNS: {
    address: '0x5Fcd5d9f6444dD23Ca2af792B58B041A14fB34EB',
    abi: DemoKNSABI as Abi,
  },
  EcosystemFund: {
    address: '0x07Cb88b1d6E06a5fd54Ae8d4A71713BF822f4389',
    abi: KaspaDomainsEcosystemFund as Abi,
  },
  KaspaDomainsRegistry: {
    address: '0x599DB3Ffbba36FfaAB3f86e92e1fCA0465b2CDeA',
    abi: KaspaDomainsRegistryABI as Abi,
  },
  DomainLinksStorage: {
    address: '0x1B1D19d94b3355CE1521f9d565B517Bd84AB4B6C',
    abi: DomainLinksStorageABI as Abi,
  },
  DomainDataStorage: {
    address: '0xFd1a17b63478cf58b96c33aBbD4584b300F122b8',
    abi: DomainDataStorageABI as Abi,
  },
  DomainCategoriesStorage: {
    address: '0x73DeAC4CE5Ae3caCe36F1481B62cb635D9733E0D',
    abi: DomainCategoriesStorageABI as Abi,
  },
  DomainVotesManager: {
    address: '0xbFB179D21A082cBb30ff245b6bCAb8a5b5566bAa',
    abi: DomainVotesManagerABI as Abi,
  },
  KDCToken: {
    address: '0x48526edd858a05f8591c0BA38c10f7493174ee1E',
    abi: KDCTokenABI as Abi,
  },
} as const;

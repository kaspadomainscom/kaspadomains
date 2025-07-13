// lib/contracts.ts
import KaspaDomainsRegistryABI from '@/abis/KaspaDomainsRegistry.json';
import DomainLinksStorageABI from '@/abis/DomainLinksStorage.json';
import DomainDataStorageABI from '@/abis/DomainDataStorage.json';
import DomainCategoriesStorageABI from '@/abis/DomainCategoriesStorage.json';
import DomainLikesManagerABI from '@/abis/DomainLikesManager.json';
import KDCTokenABI from '@/abis/KDCToken.json';
import { Abi } from 'viem';

export const contracts = {
  KaspaDomainsRegistry: {
    address: '0x64e3f539B2c9cEE2cd2F097e6915E3DF0CEF7119',
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
    address: '0xAa29E4376Ddd8a20f811b33B592bE35619B31934',
    abi: DomainCategoriesStorageABI as Abi,
  },
  DomainLikesManager: {
    address: '0xE6afbD355E9c332EcC804eF72Ec8BEbC8204B1E4',
    abi: DomainLikesManagerABI as Abi,
  },
  KDCToken: {
    address: '0x5C0233786F02ced1a2d0305C090A299529E22047',
    abi: KDCTokenABI as Abi,
  },
} as const;

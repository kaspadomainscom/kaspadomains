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
    address: '0x93d15A1d6F799CAE3c0fda37257ae4dD83f02f20',
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
    address: '0xaf0e6aF9ac8ED8367A565FB3b006c07a9e148D03',
    abi: DomainLikesManagerABI as Abi,
  },
  KDCToken: {
    address: '0xAEc5f6B24e503e6D874Bf94Ce56E8e5bbF9c0741',
    abi: KDCTokenABI as Abi,
  },
} as const;

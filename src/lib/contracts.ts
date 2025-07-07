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
    address: '0x20eB1B077Bb08d9E26D69f8da0dC0a028BDa1C2E',
    abi: KaspaDomainsRegistryABI as Abi,
  },
  DomainLinksStorage: {
    address: '0xBa91BE62AEC812f829b9AB6b655bbE8005a5D6Bd',
    abi: DomainLinksStorageABI as Abi,
  },
  DomainDataStorage: {
    address: '0xC2568Ce754e5568Ba0712A61AA1eD5397511D07A',
    abi: DomainDataStorageABI as Abi,
  },
  DomainCategoriesStorage: {
    address: '0x20FD0609FCd7bc952Bd2A0b8f7427163a3604852',
    abi: DomainCategoriesStorageABI as Abi,
  },
  DomainLikesManager: {
    address: '0xB18461Ad6f5B6f753c7487CeadBd7fa04273dA5A',
    abi: DomainLikesManagerABI as Abi,
  },
  KDCToken: {
    address: '0x246fBCb9C661E24e10A59Cf92aB448fA76dF4C29',
    abi: KDCTokenABI as Abi,
  },
} as const;

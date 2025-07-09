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
    address: '0x3380ce7Dc287e435c7BE5fc302c64fe7D612Cc43',
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
    address: '0xB77C602085A69b68BcECFD50e5c96E559EE48D4e',
    abi: DomainLikesManagerABI as Abi,
  },
  KDCToken: {
    address: '0x42EA5AE7e54B884Db7B322e9c28Bb69ff225d98e',
    abi: KDCTokenABI as Abi,
  },
} as const;

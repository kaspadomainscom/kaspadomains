import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Contract,
  parseEther,
  Signer,
  Provider,
  ContractTransactionResponse,
} from "ethers";
import { DomainLikesManagerABI } from "@/abis/DomainLikesManagerABI";

// Replace with your deployed contract address
const DOMAIN_LIKES_MANAGER_ADDRESS = "0xYourContractAddressHere";

type DomainLikedEvent = {
  user: string;
  domainHash: string;
  totalLikesForDomain: number;
  totalDomainsLikedByUser: number;
};



// Define the expected method signatures
type DomainLikesManagerMethods = {
  likeDomain(domain: string, overrides: { value: bigint }): Promise<ContractTransactionResponse>;
  getDomainLikeCount(domain: string): Promise<bigint>;
  getAddressLikeCount(user: string): Promise<bigint>;
  getDomainHashesLikedByAddress(user: string): Promise<string[]>;
  getDomainHashesLikedByAddressPaginated(user: string, offset: number, limit: number): Promise<string[]>;
  setPayments(addr: string): Promise<ContractTransactionResponse>;
  on(
    event: "DomainLiked",
    listener: (
      user: string,
      domainHash: string,
      totalLikesForDomain: bigint,
      totalDomainsLikedByUser: bigint
    ) => void
  ): void;
  off(
    event: "DomainLiked",
    listener: (
      user: string,
      domainHash: string,
      totalLikesForDomain: bigint,
      totalDomainsLikedByUser: bigint
    ) => void
  ): void;
};





export function useDomainLikes(provider: Provider, signer?: Signer) {
    
    const contract = useMemo(() => {
        if (!provider) return null;
        return new Contract(
        DOMAIN_LIKES_MANAGER_ADDRESS,
        DomainLikesManagerABI,
        signer ?? provider
        ) as unknown as DomainLikesManagerMethods;
    }, [provider, signer]);

    const likeDomain = useCallback(
        async (domain: string, valueEth: string) => {
            if (!contract || !signer) throw new Error("Contract or signer not initialized");

            const minEth = parseEther("5");
            const actualEth = parseEther(valueEth);

            if (actualEth < minEth) {
            throw new Error("Minimum like fee is 5 KAS");
            }

            const tx = await contract.likeDomain(domain, {
            value: actualEth,
            });
            return await tx.wait();
        },
        [contract, signer]
    );

    const getDomainLikeCount = useCallback(
        async (domain: string): Promise<number> => {
        if (!contract) return 0;
        const count = await contract.getDomainLikeCount(domain);
        return Number(count);
        },
        [contract]
    );

    const getAddressLikeCount = useCallback(
        async (address: string): Promise<number> => {
        if (!contract) return 0;
        const count = await contract.getAddressLikeCount(address);
        return Number(count);
        },
        [contract]
    );

    const getDomainHashesLikedByAddress = useCallback(
        async (address: string): Promise<string[]> => {
        if (!contract) return [];
        return await contract.getDomainHashesLikedByAddress(address);
        },
        [contract]
    );

    const getDomainHashesLikedByAddressPaginated = useCallback(
        async (address: string, offset: number, limit: number): Promise<string[]> => {
        if (!contract) return [];
        return await contract.getDomainHashesLikedByAddressPaginated(address, offset, limit);
        },
        [contract]
    );

    const setPayments = useCallback(
        async (paymentsAddress: string) => {
        if (!contract || !signer) throw new Error("Contract or signer not initialized");
        const tx = await contract.setPayments(paymentsAddress);
        return await tx.wait();
        },
        [contract, signer]
    );

    const [events, setEvents] = useState<DomainLikedEvent[]>([]);

    useEffect(() => {
        if (!contract) return;

        const onDomainLiked = (
        user: string,
        domainHash: string,
        totalLikesForDomain: bigint,
        totalDomainsLikedByUser: bigint
        ) => {
        setEvents((prev) => [
            ...prev,
            {
            user,
            domainHash,
            totalLikesForDomain: Number(totalLikesForDomain),
            totalDomainsLikedByUser: Number(totalDomainsLikedByUser),
            },
        ]);
        };

        contract.on("DomainLiked", onDomainLiked);
        return () => {
        contract.off("DomainLiked", onDomainLiked);
        };
    }, [contract]);

    return {
        likeDomain,
        getDomainLikeCount,
        getAddressLikeCount,
        getDomainHashesLikedByAddress,
        getDomainHashesLikedByAddressPaginated,
        setPayments,
        events,
    };
}

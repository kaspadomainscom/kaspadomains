// src/hooks/solidity/useRegisterDomain.ts
"use client";

import { useCallback, useState } from "react";
import { ethers } from "ethers";
import KaspaDomainsRegistryAbi from "@/abi/KaspaDomainsRegistry.json";

const CONTRACT_ADDRESS = "0xYourKaspaDomainsRegistryAddress"; // Replace with your actual address

export function useRegisterDomain() {
  const [txHash, setTxHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerDomain = useCallback(async (domain: string, owner: string) => {
    try {
      if (!window.ethereum) throw new Error("MetaMask is not available.");

      setLoading(true);
      setError(null);
      setTxHash(null);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const contract = new ethers.Contract(CONTRACT_ADDRESS, KaspaDomainsRegistryAbi, signer);

      const tx = await contract.registerDomain(domain, owner, {
        value: ethers.parseEther("287"), // Adjust based on your contract's pricing
      });

      await tx.wait(); // Wait for confirmation

      setTxHash(tx.hash);
      return tx.hash;
    } catch (err: unknown) {
      console.error("Domain registration failed:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Transaction failed due to an unknown error.");
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    registerDomain,
    loading,
    txHash,
    error,
  };
}

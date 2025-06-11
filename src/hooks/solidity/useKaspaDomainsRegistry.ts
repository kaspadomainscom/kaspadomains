import { BrowserProvider, Contract, Signer } from "ethers";
import ABI from "@/abi/KaspaDomainsRegistry.json";

const CONTRACT_ADDRESS = "0xYourContractAddress"; // replace

export function useKaspaDomainsRegistry() {
  const getContract = async () => {
    if (!window.ethereum) throw new Error("MetaMask not available");

    const provider = new BrowserProvider(window.ethereum);
    const signer: Signer = await provider.getSigner();

    return new Contract(CONTRACT_ADDRESS, ABI, signer);
  };

  return { getContract };
}

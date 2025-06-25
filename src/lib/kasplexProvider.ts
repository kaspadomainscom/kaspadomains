// src/lib/kasplexProvider.ts
import { JsonRpcProvider } from "ethers";
import { KASPLEX_TESTNET } from "./kasplex";

export const kasplexProvider = new JsonRpcProvider(KASPLEX_TESTNET.rpcUrls[0]);

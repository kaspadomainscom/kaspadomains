// src/data/categoriesManifest.ts
import { charactersDomains } from "./categories/characters";
import { financeDomains } from "./categories/finance";
import { gamingDomains } from "./categories/gaming";
import { memeDomains } from "./categories/meme";
import { Domain } from "./types";

export const categoriesData: Record<
  string,
  {
    title: string;
    domains: Domain[];
  }
> = {
  finance: {
    title: "Finance Domains",
    domains: financeDomains,
  },
  gaming: {
    title: "Gaming Domains",
    domains: gamingDomains,
  },
  characters: {
    title: "Known Characters",
    domains: charactersDomains,
  },
  memes: {
    title: "Memes & Internet Culture",
    domains: memeDomains,
  },
  // etc...
  // Add other categories similarly
};

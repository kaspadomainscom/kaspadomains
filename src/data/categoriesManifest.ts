// src/data/categoriesManifest.ts
import { club100k } from "./categories/100kclub";
import { club10k } from "./categories/10kclub";
import { club999 } from "./categories/999club";
import { charactersDomains } from "./categories/characters";
import { finance } from "./categories/finance";
import { gamingDomains } from "./categories/gaming";
import { memeDomains } from "./categories/meme";
import { namesDomains } from "./categories/short";
import { Domain } from "./types";

export const categoriesData: Record<
  string,
  {
    title: string;
    domains: Domain[];
  }
> = {
  "10kclub": {
    title: "10k club",
    domains: club10k,
  },
  "100kclub": {
    title: "100k club",
    domains: club100k,
  },
  "999club": {
    title: "999 club",
    domains: club999,
  },
  finance: {
    title: "Finance Domains",
    domains: finance,
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
  short: {
    title: "Memes & Internet Culture",
    domains: namesDomains,
  },
  // etc...
  // Add other categories similarly
};

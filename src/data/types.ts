// src/data/types.ts

export interface Domain {
  id: number;
  domainHash: bigint;
  name: string;
  owner: string;
  createdAt: number;
  isActive: boolean;
  feePaid: string;
};

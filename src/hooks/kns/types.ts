// src/hooks/kns/types.ts
export interface DomainAsset {
  assetId: string;
  mimeType?: string;
  asset: string;
  creationBlockTime: string;
  owner: string;
  isDomain: boolean;
  isVerifiedDomain: boolean;
  status: 'default' | 'listed' | string;
}

export interface Pagination {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

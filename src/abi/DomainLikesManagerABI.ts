// src/constants/abi/DomainLikesManagerABI.ts
export const DomainLikesManagerABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "_registry", "type": "address" },
      { "internalType": "address", "name": "_payments", "type": "address" },
      { "internalType": "uint256", "name": "_maxLikesPerUser", "type": "uint256" }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "domain", "type": "string" }
    ],
    "name": "likeDomain",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "user", "type": "address" }
    ],
    "name": "getDomainHashesLikedByAddress",
    "outputs": [
      { "internalType": "bytes32[]", "name": "", "type": "bytes32[]" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "user", "type": "address" },
      { "internalType": "uint256", "name": "offset", "type": "uint256" },
      { "internalType": "uint256", "name": "limit", "type": "uint256" }
    ],
    "name": "getDomainHashesLikedByAddressPaginated",
    "outputs": [
      { "internalType": "bytes32[]", "name": "", "type": "bytes32[]" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "domain", "type": "string" }
    ],
    "name": "getDomainLikeCount",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "user", "type": "address" }
    ],
    "name": "getAddressLikeCount",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "user", "type": "address" },
      { "internalType": "string", "name": "domain", "type": "string" }
    ],
    "name": "hasUserLikedDomain",
    "outputs": [
      { "internalType": "bool", "name": "", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "_payments", "type": "address" }
    ],
    "name": "setPayments",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_DOMAIN_LENGTH",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_LIKES_PER_USER",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "", "type": "address" },
      { "internalType": "bytes32", "name": "", "type": "bytes32" }
    ],
    "name": "hasLikedByHash",
    "outputs": [
      { "internalType": "bool", "name": "", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "", "type": "bytes32" }
    ],
    "name": "domainLikeCountByHash",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "name": "addressLikedCount",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": true, "internalType": "bytes32", "name": "domainHash", "type": "bytes32" },
      { "indexed": false, "internalType": "uint256", "name": "totalLikesForDomain", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "totalDomainsLikedByUser", "type": "uint256" }
    ],
    "name": "DomainLiked",
    "type": "event"
  }
];

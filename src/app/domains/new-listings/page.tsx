'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { ethers } from 'ethers';
import KaspaDomainsRegistryAbi from '@/abis/KaspaDomainsRegistry.json';

const CONTRACT_ADDRESS = '0xYourContractAddressHere';
const DOMAIN_FEE = ethers.parseEther('999'); // 999 KAS in wei

type DomainInput = {
  domain: string;
  title: string;
  description: string;
  website: string;
  categories: string[];
};

export default function NewDomainPage() {
  const searchParams = useSearchParams();
  const domainFromQuery = searchParams.get('name') || '';

  const [domainName, setDomainName] = useState(domainFromQuery);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setDomainName(domainFromQuery);
  }, [domainFromQuery]);

  function addUniqueItem(
    item: string,
    list: string[],
    setter: (val: string[]) => void,
    resetInput: () => void
  ) {
    const trimmed = item.trim();
    if (trimmed && !list.includes(trimmed)) {
      setter([...list, trimmed]);
      resetInput();
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage('');

    const domainTrimmed = domainName.trim();

    if (!domainTrimmed.toLowerCase().endsWith('.kas')) {
      setMessage('❌ Domain must end with .kas');
      return;
    }

    if (!window.ethereum) {
      setMessage('❌ MetaMask or Ethereum wallet not found.');
      return;
    }

    try {
      setLoading(true);
      setMessage('🔌 Connecting to wallet...');

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      const contract = new ethers.Contract(CONTRACT_ADDRESS, KaspaDomainsRegistryAbi, signer);
      const contractOwner = await contract.owner();
      const isOwner = contractOwner.toLowerCase() === userAddress.toLowerCase();

      const domainInput: DomainInput = {
        domain: domainTrimmed,
        title: title.trim(),
        description: description.trim(),
        website: website.trim(),
        categories,
      };

      setMessage('⏳ Sending transaction...');
      const tx = await contract.listDomain(domainInput, {
        value: isOwner ? 0 : DOMAIN_FEE,
      });

      setMessage('⏳ Waiting for confirmation...');
      await tx.wait();

      setMessage(`✅ Domain "${domainTrimmed}" successfully listed.`);

      setDomainName('');
      setTitle('');
      setDescription('');
      setWebsite('');
      setCategories([]);
      setNewCategory('');
    } catch (err) {
      console.error(err);
      if (err instanceof Error) setMessage(`❌ Error: ${err.message}`);
      else setMessage('❌ Unknown error occurred.');
    } finally {
      setLoading(false);
    }
  }

  function InputField({
    label,
    value,
    setValue,
    placeholder = '',
    required = false,
    textarea = false,
    type = 'text',
  }: {
    label: string;
    value: string;
    setValue: (val: string) => void;
    placeholder?: string;
    required?: boolean;
    textarea?: boolean;
    type?: string;
  }) {
    return (
      <div>
        <label className="block font-semibold text-kaspaMint mb-1">{label}</label>
        {textarea ? (
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            required={required}
            rows={4}
            className="w-full bg-[#112524] border border-kaspaMint text-white rounded px-3 py-2 placeholder:text-gray-400"
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            required={required}
            className="w-full bg-[#112524] border border-kaspaMint text-white rounded px-3 py-2 placeholder:text-gray-400"
          />
        )}
      </div>
    );
  }

  function DynamicListInput({
    label,
    items,
    newItem,
    setNewItem,
    onAdd,
    placeholder = '',
    type = 'text',
  }: {
    label: string;
    items: string[];
    newItem: string;
    setNewItem: (val: string) => void;
    onAdd: () => void;
    placeholder?: string;
    type?: string;
  }) {
    return (
      <div>
        <label className="block font-semibold text-kaspaMint mb-1">{label}</label>
        <div className="flex gap-2">
          <input
            type={type}
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-[#112524] border border-kaspaMint text-white rounded px-3 py-2 placeholder:text-gray-400"
          />
          <button
            type="button"
            onClick={onAdd}
            disabled={!newItem.trim()}
            className="bg-kaspaGreen hover:bg-kaspaMint disabled:opacity-50 disabled:cursor-not-allowed text-[#0F2F2E] font-semibold px-4 py-2 rounded transition"
          >
            Add
          </button>
        </div>
        {items.length > 0 && (
          <ul className="mt-2 text-sm text-kaspaMint list-disc pl-5 space-y-1">
            {items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <main className="max-w-2xl mx-auto p-8 mt-12 bg-[#0F2F2E] border border-kaspaMint rounded-xl shadow-md">
      <h1 className="text-3xl font-bold text-center text-kaspaGreen mb-8">
        List a New <span className="text-kaspaMint">.kas</span> Domain
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <InputField
          label="Domain Name"
          value={domainName}
          setValue={setDomainName}
          placeholder="e.g. myproject.kas"
          required
        />
        <InputField label="Title" value={title} setValue={setTitle} />
        <InputField label="Description" value={description} setValue={setDescription} textarea />
        <InputField label="Website URL" type="url" value={website} setValue={setWebsite} />

        <DynamicListInput
          label="Categories"
          items={categories}
          newItem={newCategory}
          setNewItem={setNewCategory}
          onAdd={() => addUniqueItem(newCategory, categories, setCategories, () => setNewCategory(''))}
          placeholder="e.g. NFT, wallet, DEX"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-kaspaGreen hover:bg-kaspaMint text-[#0F2F2E] py-3 px-6 rounded font-semibold transition"
        >
          {loading ? 'Submitting...' : 'Submit Domain'}
        </button>
      </form>

      {message && (
        <p
          className={`mt-6 text-center text-sm px-4 py-3 rounded ${
            message.startsWith('✅')
              ? 'bg-green-100 text-green-800'
              : message.startsWith('❌')
              ? 'bg-red-100 text-red-800'
              : 'bg-blue-100 text-blue-800'
          }`}
        >
          {message}
        </p>
      )}
    </main>
  );
}

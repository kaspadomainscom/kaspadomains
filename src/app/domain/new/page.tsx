'use client';

import { useState, FormEvent } from 'react';
import { ethers } from 'ethers';
import KaspaDomainsRegistryAbi from '@/abi/KaspaDomainsRegistry.json';

// Replace with your deployed contract address
const CONTRACT_ADDRESS = '0xYourContractAddressHere';
const DOMAIN_FEE = ethers.parseEther('287'); // 287 KAS in wei

type DomainInput = {
  domain: string;
  title: string;
  description: string;
  image: string;
  links: string[];
  categories: string[];
};

export default function NewDomainPage() {
  const [domainName, setDomainName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [links, setLinks] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [newLink, setNewLink] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddItem = (
    item: string,
    setter: (val: string[]) => void,
    list: string[],
    label: 'link' | 'category'
  ) => {
    const trimmed = item.trim();
    if (trimmed && !list.includes(trimmed)) {
      setter([...list, trimmed]);
      if (label === 'link') setNewLink('');
      else setNewCategory('');
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage('');

    if (!domainName.trim().toLowerCase().endsWith('.kas')) {
      setMessage('❌ Domain must end with .kas');
      return;
    }

    try {
      setLoading(true);
      setMessage('🔌 Connecting to wallet...');

      if (!window.ethereum) {
        setMessage('❌ MetaMask or Ethereum wallet not found.');
        setLoading(false);
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        KaspaDomainsRegistryAbi,
        signer
      );

      // Check ownership: assuming contract.owner() returns owner address
      const contractOwner = await contract.owner();
      const isOwner = contractOwner.toLowerCase() === userAddress.toLowerCase();

      const domainInput: DomainInput = {
        domain: domainName.trim(),
        title: title.trim(),
        description: description.trim(),
        image: image.trim(),
        links,
        categories,
      };

      setMessage('⏳ Sending transaction...');

      const tx = await contract.listDomain(domainInput, {
        value: isOwner ? 0 : DOMAIN_FEE,
      });

      setMessage('⏳ Transaction sent. Waiting for confirmation...');
      await tx.wait();

      setMessage(`✅ Success! Domain "${domainName.trim()}" listed.`);

      // Clear form
      setDomainName('');
      setTitle('');
      setDescription('');
      setImage('');
      setLinks([]);
      setCategories([]);
      setNewLink('');
      setNewCategory('');
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setMessage(`❌ Error: ${err.message}`);
      } else {
        setMessage('❌ Unknown error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  const InputBlock = ({
    label,
    value,
    setValue,
    type = 'text',
    placeholder = '',
    required = false,
    textarea = false,
  }: {
    label: string;
    value: string;
    setValue: (val: string) => void;
    type?: string;
    placeholder?: string;
    required?: boolean;
    textarea?: boolean;
  }) => (
    <div>
      <label className="block font-semibold text-kaspaMint mb-1">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full bg-[#112524] border border-kaspaMint text-white rounded px-3 py-2 placeholder:text-gray-400"
          placeholder={placeholder}
          required={required}
          rows={4}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full bg-[#112524] border border-kaspaMint text-white rounded px-3 py-2 placeholder:text-gray-400"
          placeholder={placeholder}
          required={required}
        />
      )}
    </div>
  );

  const DynamicListInput = ({
    label,
    items,
    newItem,
    setNewItem,
    onAdd,
    type = 'text',
    placeholder = '',
  }: {
    label: string;
    items: string[];
    newItem: string;
    setNewItem: (val: string) => void;
    onAdd: () => void;
    type?: string;
    placeholder?: string;
  }) => (
    <div>
      <label className="block font-semibold text-kaspaMint mb-1">{label}</label>
      <div className="flex gap-2">
        <input
          type={type}
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          className="flex-1 bg-[#112524] border border-kaspaMint text-white rounded px-3 py-2 placeholder:text-gray-400"
          placeholder={placeholder}
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

  return (
    <main className="max-w-2xl mx-auto p-8 mt-12 bg-[#0F2F2E] border border-kaspaMint rounded-xl shadow-md">
      <h1 className="text-3xl font-bold text-center text-kaspaGreen mb-8">
        List a New <span className="text-kaspaMint">.kas</span> Domain
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <InputBlock
          label="Domain Name"
          value={domainName}
          setValue={setDomainName}
          placeholder="e.g. myproject.kas"
          required
        />
        <InputBlock label="Title" value={title} setValue={setTitle} />
        <InputBlock
          label="Description"
          value={description}
          setValue={setDescription}
          textarea
        />
        <InputBlock
          label="Image URL"
          type="url"
          value={image}
          setValue={setImage}
        />

        <DynamicListInput
          label="Links"
          items={links}
          newItem={newLink}
          setNewItem={setNewLink}
          onAdd={() => handleAddItem(newLink, setLinks, links, 'link')}
          type="url"
          placeholder="https://twitter.com/yourhandle"
        />

        <DynamicListInput
          label="Categories"
          items={categories}
          newItem={newCategory}
          setNewItem={setNewCategory}
          onAdd={() =>
            handleAddItem(newCategory, setCategories, categories, 'category')
          }
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

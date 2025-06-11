"use client";

import { useState, FormEvent } from "react";
import { ethers } from "ethers";
import KaspaDomainsRegistryAbi from "@/abi/KaspaDomainsRegistry.json";

// Replace with your deployed contract address
const CONTRACT_ADDRESS = "0xYourContractAddressHere";
const DOMAIN_FEE = ethers.parseEther("287");


type DomainInput = {
  domain: string;
  title: string;
  description: string;
  image: string;
  links: string[];
  categories: string[];
};

export default function NewDomainPage() {
  const [domainName, setDomainName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [links, setLinks] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [newLink, setNewLink] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAddItem = (
    item: string,
    setter: (val: string[]) => void,
    list: string[],
    label: "link" | "category"
  ): void => {
    if (item.trim()) {
      setter([...list, item.trim()]);
      if (label === "link") setNewLink("");
      else setNewCategory("");
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (!domainName.endsWith(".kas")) {
      setMessage("Domain must end with .kas");
      return;
    }

    try {
      setLoading(true);
      setMessage("Connecting to wallet...");

      if (!window.ethereum) {
        setMessage("MetaMask or Ethereum wallet not found.");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        KaspaDomainsRegistryAbi,
        signer
      );

      const input: DomainInput = {
        domain: domainName,
        title,
        description,
        image,
        links,
        categories,
      };

      const isOwner =
        (await contract.owner()).toLowerCase() === userAddress.toLowerCase();

      const tx = await contract.listDomain(input, {
        value: isOwner ? 0 : DOMAIN_FEE,
      });

      setMessage("Transaction sent. Waiting for confirmation...");
      await tx.wait();

      setMessage(`✅ Success! Domain "${domainName}" listed.`);
      setDomainName("");
      setTitle("");
      setDescription("");
      setImage("");
      setLinks([]);
      setCategories([]);
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? `❌ Error: ${err.message}` : "❌ Unknown error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const InputBlock = ({
    label,
    value,
    setValue,
    type = "text",
    placeholder = "",
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
      <label className="block font-medium mb-1">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2"
          placeholder={placeholder}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2"
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
    type = "text",
    placeholder = "",
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
      <label className="block font-medium mb-1">{label}</label>
      <div className="flex gap-2">
        <input
          type={type}
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          className="flex-1 border border-gray-300 rounded px-3 py-2"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={onAdd}
          className="bg-kaspaGreen text-white px-3 py-2 rounded hover:bg-kaspaMint"
        >
          Add
        </button>
      </div>
      {items.length > 0 && (
        <ul className="mt-2 text-sm text-gray-700 list-disc pl-5 space-y-1">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <main className="max-w-2xl mx-auto p-6 mt-10 bg-white rounded-lg shadow">
      <h1 className="text-3xl font-bold mb-6 text-center text-kaspaGreen">
        Register a New .kas Domain
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
        <InputBlock label="Description" value={description} setValue={setDescription} textarea />
        <InputBlock label="Image URL" type="url" value={image} setValue={setImage} />

        <DynamicListInput
          label="Links"
          items={links}
          newItem={newLink}
          setNewItem={setNewLink}
          onAdd={() => handleAddItem(newLink, setLinks, links, "link")}
          type="url"
          placeholder="https://twitter.com/yourhandle"
        />

        <DynamicListInput
          label="Categories"
          items={categories}
          newItem={newCategory}
          setNewItem={setNewCategory}
          onAdd={() => handleAddItem(newCategory, setCategories, categories, "category")}
          placeholder="e.g. NFT, wallet, DEX"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-kaspaGreen hover:bg-kaspaMint text-white py-3 px-6 rounded transition font-semibold"
        >
          {loading ? "Submitting..." : "Submit Domain"}
        </button>
      </form>

      {message && (
        <p className="mt-6 text-center text-sm text-gray-800 whitespace-pre-wrap">{message}</p>
      )}
    </main>
  );
}

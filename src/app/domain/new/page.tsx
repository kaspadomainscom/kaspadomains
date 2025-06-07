"use client";

import { useState } from "react";

export default function NewDomainPage() {
  const [domainName, setDomainName] = useState("");
  const [owner, setOwner] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!domainName) {
      setMessage("Please enter a domain name.");
      return;
    }

    // TODO: Add your domain creation logic here, e.g., call API or smart contract
    setMessage(`Domain "${domainName}" submitted for creation by owner "${owner}".`);
    
    // Reset form (optional)
    setDomainName("");
    setOwner("");
  };

  return (
    <main className="max-w-xl mx-auto p-6 bg-white rounded shadow-md mt-8">
      <h1 className="text-2xl font-bold mb-4">Create New Kaspa Domain</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="domainName" className="block font-medium mb-1">
            Domain Name (e.g. example.kas)
          </label>
          <input
            id="domainName"
            type="text"
            value={domainName}
            onChange={(e) => setDomainName(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
            placeholder="Enter domain name"
            required
          />
        </div>

        <div>
          <label htmlFor="owner" className="block font-medium mb-1">
            Owner (Kaspa wallet address or identifier)
          </label>
          <input
            id="owner"
            type="text"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
            placeholder="Enter owner info"
          />
        </div>

        <button
          type="submit"
          className="bg-kaspaGreen px-4 py-2 rounded text-white hover:bg-kaspaMint transition"
        >
          Submit
        </button>
      </form>

      {message && <p className="mt-4 text-sm text-gray-700">{message}</p>}
    </main>
  );
}

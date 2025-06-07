"use client";

import { useState } from "react";

export default function EditDomainPage() {
  // Example initial values, replace with real fetched data
  const [domainName, setDomainName] = useState("example.kas");
  const [owner, setOwner] = useState("kaspa-wallet-address-123");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!domainName) {
      setMessage("Domain name cannot be empty.");
      return;
    }

    // TODO: Implement your update logic here (API call, smart contract update, etc)
    setMessage(`Domain "${domainName}" updated with owner "${owner}".`);
  };

  return (
    <main className="max-w-xl mx-auto p-6 bg-white rounded shadow-md mt-8">
      <h1 className="text-2xl font-bold mb-4">Edit Kaspa Domain</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="domainName" className="block font-medium mb-1">
            Domain Name
          </label>
          <input
            id="domainName"
            type="text"
            value={domainName}
            onChange={(e) => setDomainName(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
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
          />
        </div>

        <button
          type="submit"
          className="bg-kaspaGreen px-4 py-2 rounded text-white hover:bg-kaspaMint transition"
        >
          Save Changes
        </button>
      </form>

      {message && <p className="mt-4 text-sm text-gray-700">{message}</p>}
    </main>
  );
}

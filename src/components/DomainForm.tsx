'use client';

import { useCheckDomainAvailability } from '@/hooks/kns/api/useCheckDomainAvailability';
import { useEffect, useState } from 'react';
import Image from 'next/image';

const DomainForm = () => {
  const [domain, setDomain] = useState('');
  const [address] = useState('kaspa:your-address'); // Replace with actual connected wallet address
  const [isAvailable, setIsAvailable] = useState<null | boolean>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const { mutateAsync: checkAvailability, isPending } = useCheckDomainAvailability();

  // Live domain availability check with debounce
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (domain) {
        checkAvailability({ domainNames: [domain], address })
          .then((res) => {
            setIsAvailable(res[0]?.available ?? null);
          })
          .catch(() => setIsAvailable(null));
      } else {
        setIsAvailable(null);
      }
    }, 600);

    return () => clearTimeout(timeout);
  }, [domain, address, checkAvailability]);

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('domainFormDraft');
    if (draft) {
      const parsed = JSON.parse(draft);
      setDomain(parsed.domain || '');
      setImagePreview(parsed.imagePreview || null);
    }
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const saveDraft = () => {
    localStorage.setItem(
      'domainFormDraft',
      JSON.stringify({ domain, imagePreview })
    );
    alert('Draft saved');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Form submitted (implement actual logic)');
    // TODO: Add smart contract interaction here
  };

  if (previewMode) {
    return (
      <div className="p-4 border rounded-lg max-w-xl mx-auto bg-white dark:bg-zinc-900">
        <h2 className="text-xl font-bold mb-4">Preview</h2>
        <p><strong>Domain:</strong> {domain}.kas</p>
        <p>
          <strong>Status:</strong>{' '}
          {isAvailable === null
            ? 'Unknown'
            : isAvailable
              ? '✅ Available'
              : '❌ Taken'}
        </p>
        {imagePreview && (
          <div className="mt-4 w-48">
            <Image
              src={imagePreview}
              alt="Domain image preview"
              width={192}
              height={192}
              className="rounded-lg border"
              unoptimized // allow dynamic previews
            />
          </div>
        )}
        <button
          onClick={() => setPreviewMode(false)}
          className="mt-6 btn btn-secondary"
          type="button"
        >
          Back to Edit
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 max-w-xl mx-auto p-4 border rounded-lg bg-white dark:bg-zinc-900"
    >
      <h2 className="text-2xl font-semibold">Create Your .kas Domain</h2>

      {/* Domain Input */}
      <div>
        <label htmlFor="domain-input" className="block mb-1 font-medium">Domain</label>
        <input
          id="domain-input"
          name="domain"
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="e.g. yourname"
          className="w-full p-2 border rounded"
          autoComplete="off"
          aria-describedby="domain-status"
        />
        {domain && (
          <p id="domain-status" className="text-sm mt-1">
            {isPending
              ? 'Checking availability...'
              : isAvailable === null
                ? ''
                : isAvailable
                  ? '✅ Domain is available'
                  : '❌ Domain is taken'}
          </p>
        )}
      </div>

      {/* Image Upload */}
      <div>
        <label htmlFor="image-upload" className="block mb-1 font-medium">Upload Image</label>
        <input
          id="image-upload"
          name="image-upload"
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          aria-describedby={imagePreview ? 'image-preview' : undefined}
        />
        {imagePreview && (
          <div id="image-preview" className="mt-2 w-48">
            <Image
              src={imagePreview}
              alt="Preview"
              width={192}
              height={192}
              className="rounded-xl border"
              unoptimized
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 mt-4">
        <button
          type="button"
          onClick={saveDraft}
          className="btn border px-4 py-2 rounded"
        >
          💾 Save Draft
        </button>
        <button
          type="button"
          onClick={() => setPreviewMode(true)}
          className="btn border px-4 py-2 rounded"
        >
          👁 Preview
        </button>
        <button
          type="submit"
          className="btn bg-kaspaGreen text-white px-4 py-2 rounded"
        >
          🚀 Submit
        </button>
      </div>
    </form>
  );
};

export default DomainForm;

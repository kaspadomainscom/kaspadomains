// // src/components/CustomizeDomainForm.tsx
// "use client";

// import React, { useState } from "react";

// interface CustomizeDomainFormProps {
//   domainName: string;
// }

// export default function CustomizeDomainForm({ domainName }: CustomizeDomainFormProps) {
//   const [tagline, setTagline] = useState("");
//   const [bio, setBio] = useState("");
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [successMsg, setSuccessMsg] = useState<string | null>(null);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setSaving(true);
//     setError(null);
//     setSuccessMsg(null);

//     try {
//       // POST to your backend endpoint that saves customization data,
//       // e.g. /api/domains/[domain]/customize
//       const res = await fetch(`/api/domains/${encodeURIComponent(domainName)}/customize`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ tagline, bio }),
//       });

//       if (!res.ok) {
//         throw new Error((await res.text()) || "Failed to save.");
//       }
//       setSuccessMsg("Customization saved!");
//     } catch (err: any) {
//       setError(err.message || "Unknown error");
//     } finally {
//       setSaving(false);
//     }
//   };

//   return (
//     <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
//       <h2 className="text-2xl font-semibold text-blue-800 mb-4">Customize Your Domain</h2>
//       <form onSubmit={handleSubmit} className="space-y-4">
//         <div>
//           <label htmlFor="tagline" className="block text-sm font-medium text-blue-700">
//             Tagline
//           </label>
//           <input
//             id="tagline"
//             name="tagline"
//             type="text"
//             value={tagline}
//             onChange={(e) => setTagline(e.target.value)}
//             className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
//             placeholder="Enter a short tagline"
//             required
//           />
//         </div>

//         <div>
//           <label htmlFor="bio" className="block text-sm font-medium text-blue-700">
//             Description / Bio
//           </label>
//           <textarea
//             id="bio"
//             name="bio"
//             rows={3}
//             value={bio}
//             onChange={(e) => setBio(e.target.value)}
//             className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
//             placeholder="Tell visitors about this domain"
//             required
//           />
//         </div>

//         {error && <p className="text-red-600 text-sm">{error}</p>}
//         {successMsg && <p className="text-green-600 text-sm">{successMsg}</p>}

//         <div>
//           <button
//             type="submit"
//             disabled={saving}
//             className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
//               saving ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"
//             } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
//           >
//             {saving ? "Saving..." : "Save Customization"}
//           </button>
//         </div>
//       </form>
//     </div>
//   );
// }

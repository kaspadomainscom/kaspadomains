// src/components/pages/domain/DomainOwnerBio.tsx
export function DomainOwnerBio({ bio }: { bio: string }) {
    return (
        <section className="mt-10 bg-gray-50 border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">About the Owner</h2>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{bio}</p>
        </section>
    );
}

export type OwnerPatch = { owner: string; submitted_by: string };

/** Keep the cached directory owner aligned with the authoritative KNS owner. */
export async function syncDomainOwner(
  cachedOwner: string | null | undefined,
  knsOwner: string,
  signerAddress: string,
  update: (patch: OwnerPatch) => Promise<void>
): Promise<void> {
  if ((cachedOwner ?? '') === knsOwner) return;
  await update({ owner: knsOwner, submitted_by: signerAddress });
}


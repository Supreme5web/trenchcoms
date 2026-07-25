// Holder counts now come from Codex (via our own /api/holders proxy, so the
// Codex API key stays server-side), covering all 4 supported chains.
export async function fetchHolderCount(chain, tokenAddress) {
  if (!tokenAddress) return null;
  try {
    const res = await fetch(`/api/holders?address=${encodeURIComponent(tokenAddress.trim())}&chain=${chain}`);
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.holders === "number" ? data.holders : null;
  } catch {
    return null;
  }
}

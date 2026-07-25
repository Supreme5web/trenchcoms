// Holder counts aren't part of DexScreener's API, so this pulls from
// Solscan's public endpoint for Solana. There's no equivalent free,
// no-API-key source for Ethereum/BSC/Robinhood Chain, so those chains
// return null here and the UI shows "—" instead of a made-up number —
// wiring up a real holders source for EVM chains (e.g. an Etherscan-family
// API key) is a good next step, not something to fake client-side.
export async function fetchHolderCount(chain, tokenAddress) {
  if (!tokenAddress || chain !== "solana") return null;
  try {
    const res = await fetch(
      `https://public-api.solscan.io/token/holders?tokenAddress=${tokenAddress.trim()}&limit=1&offset=0`,
      { headers: { accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.total === "number" ? data.total : null;
  } catch {
    return null;
  }
}

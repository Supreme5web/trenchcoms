// Thin wrapper around DexScreener's public REST API.
// Docs: https://docs.dexscreener.com/api/reference
// No API key required. Rate limit on this endpoint is 300 req/min, so keep
// polling intervals sane (we use 30s in LiveTokenPanel).

const DEXSCREENER_BASE = "https://api.dexscreener.com";
const WSOL_MINT = "So11111111111111111111111111111111111111112";

// Chains supported when creating a community. `id` is what we store and
// pass straight through as DexScreener's chainId — DexScreener uses these
// exact slugs (confirmed against dexscreener.com/<slug>/... URLs).
export const CHAIN_OPTIONS = [
  { id: "solana", label: "Solana" },
  { id: "ethereum", label: "Ethereum" },
  { id: "bsc", label: "BNB Chain (BSC)" },
  { id: "robinhood", label: "Robinhood Chain" },
];

// A token can have many pairs across different DEXs/pools — pick the one
// with the deepest liquidity, since that's the most reliable price source.
function pickBestPair(pairs) {
  if (!Array.isArray(pairs) || pairs.length === 0) return null;
  return pairs.reduce((best, pair) => {
    const liquidity = pair?.liquidity?.usd || 0;
    const bestLiquidity = best?.liquidity?.usd || 0;
    return liquidity > bestLiquidity ? pair : best;
  }, pairs[0]);
}

async function fetchPairsForToken(chainId, tokenAddress) {
  const res = await fetch(`${DEXSCREENER_BASE}/tokens/v1/${chainId}/${tokenAddress}`);
  if (!res.ok) throw new Error(`DexScreener request failed (${res.status})`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Looks up a token by contract address and returns a flat, UI-friendly shape.
 * Returns null if DexScreener has no pairs indexed for the address yet
 * (common for brand-new tokens with no liquidity pool yet).
 */
export async function fetchTokenInfo(contractAddress, chainId = "solana") {
  if (!contractAddress) return null;
  const pairs = await fetchPairsForToken(chainId, contractAddress.trim());
  const pair = pickBestPair(pairs);
  if (!pair) return null;

  return {
    name: pair.baseToken?.name || null,
    symbol: pair.baseToken?.symbol || null,
    logo: pair.info?.imageUrl || null,
    priceUsd: pair.priceUsd ? Number(pair.priceUsd) : null,
    marketCap: pair.marketCap ?? pair.fdv ?? null,
    liquidityUsd: pair.liquidity?.usd ?? null,
    volume24h: pair.volume?.h24 ?? null,
    priceChange24h: pair.priceChange?.h24 ?? null,
    dexUrl: pair.url || null,
  };
}

/** Wrapped SOL's own market price, used for the "current SOL price" ticker. */
export async function fetchSolPrice() {
  const pairs = await fetchPairsForToken("solana", WSOL_MINT);
  const pair = pickBestPair(pairs);
  return pair?.priceUsd ? Number(pair.priceUsd) : null;
}

/**
 * Checks whether a token has an approved "Enhanced Token Info" (Dex Paid)
 * order on DexScreener. Solana-only, per DexScreener's own paid-listing
 * product — there's no equivalent signal to check on other chains here.
 */
export async function fetchDexPaidStatus(tokenAddress) {
  if (!tokenAddress) return false;
  try {
    const res = await fetch(`${DEXSCREENER_BASE}/orders/v1/solana/${tokenAddress.trim()}`);
    if (!res.ok) return false;
    const orders = await res.json();
    if (!Array.isArray(orders)) return false;
    return orders.some((order) => order.status === "approved");
  } catch {
    return false;
  }
}

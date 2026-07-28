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

// A token can have many pairs across different DEXs/pools. Liquidity depth
// alone isn't a reliable signal — a token that migrated pools (e.g. a
// pump.fun bonding curve moving to Raydium, or relaunched liquidity) can
// leave an old, untraded pool sitting there with locked/high liquidity but
// a frozen, stale price. 24h volume is a much better signal of which pool
// is actually the live, currently-traded one; liquidity is only used as a
// tiebreaker/fallback for brand-new pools that don't have volume history yet.
function pickBestPair(pairs) {
  if (!Array.isArray(pairs) || pairs.length === 0) return null;
  return pairs.reduce((best, pair) => {
    const volume = pair?.volume?.h24 || 0;
    const bestVolume = best?.volume?.h24 || 0;
    if (volume !== bestVolume) return volume > bestVolume ? pair : best;
    const liquidity = pair?.liquidity?.usd || 0;
    const bestLiquidity = best?.liquidity?.usd || 0;
    return liquidity > bestLiquidity ? pair : best;
  }, pairs[0]);
}

async function fetchPairsForToken(chainId, tokenAddress) {
  // cache: "no-store" defeats browser HTTP caching so polling every 30s
  // actually hits the network instead of replaying a stale cached response.
  const res = await fetch(`${DEXSCREENER_BASE}/tokens/v1/${chainId}/${tokenAddress}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`DexScreener request failed (${res.status})`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Looks up a token by contract address and returns a flat, UI-friendly shape.
 * Returns null if DexScreener has no pairs indexed for the address yet
 * (common for brand-new tokens with no liquidity pool yet).
 */
function pickSocial(socials, type) {
  return socials?.find((s) => s.type === type)?.url || null;
}

function looksLikeEvmAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// EVM chains, checked in this priority order. If the same address happens
// to exist on more than one (rare, but possible with vanity/CREATE2
// deployments), whichever comes first here wins.
const EVM_CHAIN_PRIORITY = ["ethereum", "bsc", "robinhood"];

/**
 * Detects which supported chain a contract address belongs to and returns
 * both the chain id and the DexScreener token info in one shot, so the
 * person creating/editing a community never has to manually pick a chain.
 * EVM-shaped addresses (0x + 40 hex chars) are checked against ethereum,
 * bsc, and robinhood in turn; anything else is treated as Solana, the only
 * non-0x chain this app supports.
 */
export async function detectTokenInfo(address) {
  const trimmed = (address || "").trim();
  if (!trimmed) return { chain: null, info: null };

  if (looksLikeEvmAddress(trimmed)) {
    const results = await Promise.all(
      EVM_CHAIN_PRIORITY.map(async (chain) => ({
        chain,
        info: await fetchTokenInfo(trimmed, chain).catch(() => null),
      }))
    );
    const match = results.find((r) => r.info);
    return match || { chain: "ethereum", info: null };
  }

  const info = await fetchTokenInfo(trimmed, "solana").catch(() => null);
  return { chain: "solana", info };
}

export async function fetchTokenInfo(contractAddress, chainId = "solana") {
  if (!contractAddress) return null;
  const pairs = await fetchPairsForToken(chainId, contractAddress.trim());
  const pair = pickBestPair(pairs);
  if (!pair) return null;

  const socials = pair.info?.socials || [];

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
    website: pair.info?.websites?.[0]?.url || null,
    description: pair.info?.description || null,
    twitter: pickSocial(socials, "twitter"),
    telegram: pickSocial(socials, "telegram"),
    discord: pickSocial(socials, "discord"),
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
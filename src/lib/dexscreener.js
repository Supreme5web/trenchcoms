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
function pickSocial(socials, kind) {
  const match = socials?.find((s) => (s.type || s.platform) === kind);
  return match?.url || match?.handle || null;
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

async function fetchCodexTokenInfo(address, chainId) {
  try {
    const res = await fetch(`/api/token-info?address=${encodeURIComponent(address)}&chain=${chainId}`);
    if (!res.ok) return null;
    const data = await res.json();
    const token = data?.token;
    if (!token) return null;
    return {
      name: token.name,
      symbol: token.symbol,
      logo: token.logo,
      priceUsd: token.priceUsd,
      marketCap: token.marketCap,
      liquidityUsd: token.liquidityUsd,
      volume24h: token.volume24h,
      priceChange24h: token.priceChange24h,
      dexUrl: null,
      website: token.website,
      description: token.description,
      banner: null,
      twitter: token.twitter,
      telegram: token.telegram,
      discord: token.discord,
      holders: token.holders,
    };
  } catch {
    return null;
  }
}

/**
 * Codex is the primary source here — one call gets metadata (name, logo,
 * description, socials) plus live stats (price, market cap, volume, 24h
 * change) and holders, all together, and it indexes tokens independently of
 * whether a DEX pair exists yet (so brand-new/pre-migration tokens still
 * resolve). DexScreener is only used as a fallback when Codex has nothing
 * for an address, and additionally contributes the "banner" header image
 * and dexUrl, which Codex doesn't provide.
 */
export async function fetchTokenInfo(contractAddress, chainId = "solana") {
  if (!contractAddress) return null;
  const trimmed = contractAddress.trim();

  const [codexInfo, pairs] = await Promise.all([
    fetchCodexTokenInfo(trimmed, chainId),
    fetchPairsForToken(chainId, trimmed).catch(() => []),
  ]);
  const pair = pickBestPair(pairs);

  if (!pair) {
    return codexInfo;
  }

  const socials = pair.info?.socials || [];
  const dexInfo = {
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
    banner: pair.info?.header || null,
    twitter: pickSocial(socials, "twitter"),
    telegram: pickSocial(socials, "telegram"),
    discord: pickSocial(socials, "discord"),
  };

  if (!codexInfo) return dexInfo;

  // Merge: Codex wins for every field it actually has data for (it's the
  // primary source); DexScreener fills in anything Codex left null,
  // including banner/dexUrl which Codex never provides at all.
  const merged = {};
  for (const key of new Set([...Object.keys(codexInfo), ...Object.keys(dexInfo)])) {
    merged[key] = codexInfo[key] ?? dexInfo[key] ?? null;
  }
  return merged;
}

/** Wrapped SOL's own market price, used for the "current SOL price" ticker. */
export async function fetchSolPrice() {
  const pairs = await fetchPairsForToken("solana", WSOL_MINT);
  const pair = pickBestPair(pairs);
  return pair?.priceUsd ? Number(pair.priceUsd) : null;
}

/**
 * Checks whether a token has an approved "Enhanced Token Info" (Dex Paid)
 * order or boost on DexScreener. Solana-only, per DexScreener's own paid-listing
 * product — there's no equivalent signal to check on other chains here.
 * Returns "Dex Paid" if the token has paid features, "Dex Not Paid" otherwise.
 */
export async function fetchDexPaidStatus(tokenAddress) {
  if (!tokenAddress) return "Dex Not Paid";

  try {
    const res = await fetch(`${DEXSCREENER_BASE}/orders/v1/solana/${tokenAddress.trim()}`);
    if (!res.ok) return "Dex Not Paid";

    const data = await res.json();

    // API returns { orders: [...], boosts: [...] }
    const orders = data?.orders || [];
    const boosts = data?.boosts || [];

    // Check both orders and boosts for approved status
    const isPaid =
      orders.some((order) => order.status === "approved") ||
      boosts.some((boost) => boost.status === "approved");

    return isPaid ? "Dex Paid" : "Dex Not Paid";
  } catch {
    return "Dex Not Paid";
  }
}

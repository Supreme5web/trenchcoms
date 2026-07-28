// Thin wrapper around DexScreener's public REST API.
// Docs: https://docs.dexscreener.com/api/reference
// No API key required.

const DEXSCREENER_BASE = "https://api.dexscreener.com";
const WSOL_MINT = "So11111111111111111111111111111111111111112";

export const CHAIN_OPTIONS = [
  { id: "solana", label: "Solana" },
  { id: "ethereum", label: "Ethereum" },
  { id: "bsc", label: "BNB Chain (BSC)" },
  { id: "robinhood", label: "Robinhood Chain" },
];

function pickBestPair(pairs) {
  if (!Array.isArray(pairs) || pairs.length === 0) return null;

  return pairs.reduce((best, pair) => {
    const volume = pair?.volume?.h24 || 0;
    const bestVolume = best?.volume?.h24 || 0;

    if (volume !== bestVolume) {
      return volume > bestVolume ? pair : best;
    }

    const liquidity = pair?.liquidity?.usd || 0;
    const bestLiquidity = best?.liquidity?.usd || 0;

    return liquidity > bestLiquidity ? pair : best;
  }, pairs[0]);
}


async function fetchPairsForToken(chainId, tokenAddress) {
  const res = await fetch(
    `${DEXSCREENER_BASE}/tokens/v1/${chainId}/${tokenAddress}`,
    {
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error(
      `DexScreener request failed (${res.status})`
    );
  }

  const data = await res.json();

  return Array.isArray(data) ? data : [];
}


function pickSocial(socials, type) {
  return (
    socials?.find((s) => s.type === type)?.url ||
    null
  );
}


function looksLikeEvmAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}


const EVM_CHAIN_PRIORITY = [
  "ethereum",
  "bsc",
  "robinhood",
];


export async function detectTokenInfo(address) {
  const trimmed = (address || "").trim();

  if (!trimmed) {
    return {
      chain: null,
      info: null,
    };
  }


  if (looksLikeEvmAddress(trimmed)) {

    const results = await Promise.all(
      EVM_CHAIN_PRIORITY.map(async (chain) => ({
        chain,
        info: await fetchTokenInfo(
          trimmed,
          chain
        ).catch(() => null),
      }))
    );


    const match = results.find(
      (r) => r.info
    );


    return (
      match || {
        chain: "ethereum",
        info: null,
      }
    );
  }


  const info = await fetchTokenInfo(
    trimmed,
    "solana"
  ).catch(() => null);


  return {
    chain: "solana",
    info,
  };
}



export async function fetchTokenInfo(
  contractAddress,
  chainId = "solana"
) {

  if (!contractAddress) return null;


  const pairs = await fetchPairsForToken(
    chainId,
    contractAddress.trim()
  );


  const pair = pickBestPair(pairs);


  if (!pair) return null;


  const socials =
    pair.info?.socials || [];


  return {

    name:
      pair.baseToken?.name || null,


    symbol:
      pair.baseToken?.symbol || null,


    logo:
      pair.info?.imageUrl || null,


    priceUsd:
      pair.priceUsd
        ? Number(pair.priceUsd)
        : null,


    marketCap:
      pair.marketCap ??
      pair.fdv ??
      null,


    liquidityUsd:
      pair.liquidity?.usd ??
      null,


    volume24h:
      pair.volume?.h24 ??
      null,


    priceChange24h:
      pair.priceChange?.h24 ??
      null,


    dexUrl:
      pair.url ||
      null,


    website:
      pair.info?.websites?.[0]?.url ||
      null,


    description:
      pair.info?.description ||
      null,


    twitter:
      pickSocial(
        socials,
        "twitter"
      ),


    telegram:
      pickSocial(
        socials,
        "telegram"
      ),


    discord:
      pickSocial(
        socials,
        "discord"
      ),
  };
}



/**
 * Wrapped SOL price
 */
export async function fetchSolPrice() {

  const pairs =
    await fetchPairsForToken(
      "solana",
      WSOL_MINT
    );


  const pair =
    pickBestPair(pairs);


  return pair?.priceUsd
    ? Number(pair.priceUsd)
    : null;
}



/**
 * Checks whether a token has DexScreener paid features.
 *
 * Returns:
 * "Dex Paid"
 * "Dex Not Paid"
 */
export async function fetchDexPaidStatus(
  tokenAddress,
  chainId = "solana"
) {

  if (!tokenAddress) {
    return "Dex Not Paid";
  }


  try {

    const res = await fetch(
      `${DEXSCREENER_BASE}/orders/v1/${chainId}/${tokenAddress.trim()}`
    );


    if (!res.ok) {

      console.warn(
        "DexScreener orders request failed:",
        res.status
      );

      return "Dex Not Paid";
    }


    const data =
      await res.json();



    const orders =
      Array.isArray(data)
        ? data
        : data?.orders || [];



    const hasApprovedOrder =
      orders.some(
        (order) =>
          order.status === "approved"
      );



    return hasApprovedOrder
      ? "Dex Paid"
      : "Dex Not Paid";



  } catch (err) {

    console.warn(
      "DexScreener orders fetch error:",
      err.message
    );


    return "Dex Not Paid";
  }
}

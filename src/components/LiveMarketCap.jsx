import React, { useEffect, useState } from "react";
import { fetchTokenInfo } from "../lib/dexscreener.js";

function formatUsd(value) {
  if (value === null || value === undefined) return null;
  return `$${Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(value)}`;
}

/**
 * Shows a community's market cap fetched live from DexScreener, instead of
 * the stored `communities.market_cap` snapshot (which only updates when the
 * community is created/edited and goes stale immediately after).
 * Falls back to the stored value while the live fetch is in flight, and to
 * "Not listed" if there's no contract address or no DexScreener data.
 */
export default function LiveMarketCap({ contractAddress, chain = "solana", fallback }) {
  const [value, setValue] = useState(fallback ?? null);

  useEffect(() => {
    let cancelled = false;
    if (!contractAddress) return undefined;
    fetchTokenInfo(contractAddress, chain)
      .then((info) => {
        if (!cancelled && info?.marketCap) setValue(info.marketCap);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [contractAddress, chain]);

  return <>{formatUsd(value) || "Not listed"}</>;
}

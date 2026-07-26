import React, { useEffect, useState } from "react";
import { fetchTokenInfo } from "../lib/dexscreener.js";

const REFRESH_MS = 30000;

function formatUsd(value) {
  if (value === null || value === undefined) return null;
  return `$${Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(value)}`;
}

/**
 * Shows a community's market cap fetched live from DexScreener, refreshing
 * on an interval while mounted — instead of the stored `communities.market_cap`
 * snapshot (which only updates when the community is created/edited) and
 * instead of a single one-time fetch that goes stale after the first load.
 */
export default function LiveMarketCap({ contractAddress, chain = "solana", fallback }) {
  const [value, setValue] = useState(fallback ?? null);

  useEffect(() => {
    if (!contractAddress) return undefined;
    let cancelled = false;

    const load = () => {
      fetchTokenInfo(contractAddress, chain)
        .then((info) => {
          if (!cancelled && info?.marketCap) setValue(info.marketCap);
        })
        .catch(() => {});
    };

    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [contractAddress, chain]);

  return <>{formatUsd(value) || "Not listed"}</>;
}
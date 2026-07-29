import React, { useEffect, useState } from "react";
import { fetchTokenInfo, fetchSolPrice, fetchDexPaidStatus, CHAIN_OPTIONS } from "../lib/dexscreener.js";
import { fetchHolderCount } from "../lib/holders.js";

const REFRESH_MS = 30000;
const CHAIN_LABELS = Object.fromEntries(CHAIN_OPTIONS.map((c) => [c.id, c.label]));

function formatUsd(value, { compact = false } = {}) {
  if (value === null || value === undefined) return "—";
  if (compact) {
    return `$${Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(value)}`;
  }
  // Small prices (typical for memecoins) need more decimal precision than
  // toLocaleString gives by default, or they'd all just show "$0.00".
  const decimals = value < 1 ? 6 : 2;
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function formatCount(value) {
  if (value === null || value === undefined) return "—";
  return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(value);
}

/**
 * Shows a native-token price ticker (Solana only) plus this community's
 * token stats (price, market cap, holders, 24h volume, 24h change, and a
 * Dex Paid badge for Solana tokens), refreshing on an interval.
 */
export default function LiveTokenPanel({ contractAddress, chain = "solana" }) {
  const [solPrice, setSolPrice] = useState(null);
  const [token, setToken] = useState(null);
  const [holders, setHolders] = useState(null);
  const [dexPaid, setDexPaid] = useState("Dex Not Paid");
  const [status, setStatus] = useState(contractAddress ? "loading" : "empty");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const solPromise = chain === "solana" ? fetchSolPrice().catch(() => null) : Promise.resolve(null);
        if (contractAddress) {
          const [sol, info, holderCount, paid] = await Promise.all([
            solPromise,
            fetchTokenInfo(contractAddress, chain),
            fetchHolderCount(chain, contractAddress),
            chain === "solana" ? fetchDexPaidStatus(contractAddress) : Promise.resolve("Dex Not Paid"),
          ]);
          if (cancelled) return;
          setSolPrice(sol);
          setToken(info);
          setHolders(holderCount);
          setDexPaid(paid);
          setStatus(info ? "ready" : "no-data");
        } else {
          const sol = await solPromise;
          if (cancelled) return;
          setSolPrice(sol);
          setStatus("empty");
        }
      } catch (err) {
        if (!cancelled) setStatus("error");
      }
    }

    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [contractAddress, chain]);

  const priceChange = token?.priceChange24h;
  const changeColor = priceChange > 0 ? "var(--accent)" : priceChange < 0 ? "var(--danger)" : "var(--text-muted)";

  return (
    <div className="glassPanel" style={{ padding: 16 }}>
      <div className="boardHeader">
        <div>
          <span className="muted" style={{ fontSize: 12 }}>{chain === "solana" ? "SOL price" : "Chain"}</span>
          <strong style={{ display: "block", fontSize: 20 }}>
            {chain === "solana" ? formatUsd(solPrice) : CHAIN_LABELS[chain] || chain}
          </strong>
        </div>
        {contractAddress && (
          <div style={{ textAlign: "right" }}>
            <span className="muted" style={{ fontSize: 12 }}>Market cap</span>
            <strong style={{ display: "block", fontSize: 20 }}>{formatUsd(token?.marketCap, { compact: true })}</strong>
          </div>
        )}
      </div>

      {status === "empty" && (
        <p className="inlineNotice">No contract address set for this community yet — live token stats will appear once one is added.</p>
      )}
      {status === "no-data" && (
        <p className="inlineNotice">Live token stats aren't available for this contract address yet (common for brand-new pools).</p>
      )}
      {status === "error" && <p className="inlineNotice">Couldn't fetch live token stats right now — retrying automatically.</p>}

      {status === "ready" && token && (
        <>
          {chain === "solana" && (
            <span className={dexPaid === "Dex Paid" ? "dexPaidBadge" : "dexNotPaidBadge"}>
              {dexPaid}
            </span>
          )}
          <div className="tokenStats" style={{ marginTop: 12 }}>
            <div className="stat">
              <span>Price</span>
              <strong>{formatUsd(token.priceUsd)}</strong>
            </div>
            <div className="stat">
              <span>Holders</span>
              <strong>{formatCount(holders)}</strong>
            </div>
            <div className="stat">
              <span>24h volume</span>
              <strong>{formatUsd(token.volume24h, { compact: true })}</strong>
            </div>
            <div className="stat">
              <span>24h change</span>
              <strong style={{ color: changeColor }}>
                {priceChange === null || priceChange === undefined ? "—" : `${priceChange > 0 ? "+" : ""}${priceChange.toFixed(2)}%`}
              </strong>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

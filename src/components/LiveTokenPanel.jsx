import React, { useEffect, useState } from "react";
import { fetchTokenInfo, fetchSolPrice } from "../lib/dexscreener.js";

const REFRESH_MS = 30000;

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

/**
 * Shows live SOL price + this community's token stats (price, market cap,
 * liquidity, 24h volume, 24h change), refreshing on an interval.
 * Renders nothing but a subtle "no live data" notice if there's no
 * contract address or DexScreener has nothing indexed for it yet.
 */
export default function LiveTokenPanel({ contractAddress }) {
  const [solPrice, setSolPrice] = useState(null);
  const [token, setToken] = useState(null);
  const [status, setStatus] = useState(contractAddress ? "loading" : "empty");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const solPromise = fetchSolPrice().catch(() => null);
        if (contractAddress) {
          const [sol, info] = await Promise.all([solPromise, fetchTokenInfo(contractAddress)]);
          if (cancelled) return;
          setSolPrice(sol);
          setToken(info);
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
  }, [contractAddress]);

  const priceChange = token?.priceChange24h;
  const changeColor = priceChange > 0 ? "var(--accent)" : priceChange < 0 ? "var(--danger)" : "var(--text-muted)";

  return (
    <div className="glassPanel" style={{ padding: 16 }}>
      <div className="boardHeader">
        <div>
          <span className="muted" style={{ fontSize: 12 }}>SOL price</span>
          <strong style={{ display: "block", fontSize: 20 }}>{formatUsd(solPrice)}</strong>
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
        <p className="inlineNotice">This contract address isn't indexed on DexScreener yet (common for brand-new pools).</p>
      )}
      {status === "error" && <p className="inlineNotice">Couldn't reach DexScreener right now — retrying automatically.</p>}

      {status === "ready" && token && (
        <div className="tokenStats" style={{ marginTop: 12 }}>
          <div className="stat">
            <span>Price</span>
            <strong>{formatUsd(token.priceUsd)}</strong>
          </div>
          <div className="stat">
            <span>Liquidity</span>
            <strong>{formatUsd(token.liquidityUsd, { compact: true })}</strong>
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
      )}
    </div>
  );
}

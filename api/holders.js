// Holder counts via RugCheck (Solana-only — no EVM equivalent here).
// RugCheck's exact field name for total holder count isn't nailed down from
// public docs, so this tries the most likely field names and logs the raw
// response keys server-side (visible in Vercel's Functions logs) so we can
// correct it fast if the field name turns out to be different.
export default async function handler(req, res) {
  const { address, chain } = req.query;

  if (!address || chain !== "solana") {
    return res.status(200).json({ holders: null });
  }

  try {
    const response = await fetch(`https://api.rugcheck.xyz/v1/tokens/${address}/report`, {
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      console.error("RugCheck request failed:", response.status);
      return res.status(200).json({ holders: null });
    }

    const json = await response.json();
    console.log("RugCheck response keys:", Object.keys(json));

    const holders =
      typeof json.totalHolders === "number"
        ? json.totalHolders
        : typeof json.holders === "number"
        ? json.holders
        : Array.isArray(json.topHolders)
        ? json.topHolders.length
        : null;

    return res.status(200).json({ holders });
  } catch (err) {
    console.error("RugCheck fetch error:", err.message);
    return res.status(200).json({ holders: null });
  }
}
const NETWORK_IDS = {
  solana: 1399811149,
  ethereum: 1,
  bsc: 56,
  robinhood: 4663,
};

// Primary source for token data. One filterTokens call gets us metadata
// (name/symbol/logo/description/socials) AND live stats (price, market cap,
// liquidity, 24h volume, 24h change, holders) together. DexScreener is used
// as a fallback (see dexscreener.js) only when Codex has nothing for a
// given address — not the other way around.
export default async function handler(req, res) {
  const { address, chain } = req.query;
  const networkId = NETWORK_IDS[chain];

  if (!address || !networkId) {
    return res.status(400).json({ error: "Missing or unsupported address/chain" });
  }

  const apiKey = process.env.CODEX_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "CODEX_API_KEY is not set in the Vercel project's environment variables" });
  }

  const tokenId = `${address}:${networkId}`;
  const query = `
    query TokenInfo($tokens: [String!], $limit: Int) {
      filterTokens(input: { tokens: $tokens, limit: $limit }) {
        results {
          token {
            name
            symbol
            socialLinks { twitter telegram discord website }
            info { imageLargeUrl imageSmallUrl description }
          }
          priceUSD
          marketCap
          liquidity
          volume24
          change24
          holders
        }
      }
    }
  `;

  try {
    const response = await fetch("https://graph.codex.io/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: apiKey },
      body: JSON.stringify({ query, variables: { tokens: [tokenId], limit: 1 } }),
    });
    const json = await response.json();

    if (json.errors) {
      console.error("Codex token-info error:", json.errors);
      return res.status(502).json({ error: json.errors[0]?.message || "Codex API error" });
    }

    const result = json.data?.filterTokens?.results?.[0];
    if (!result || !result.token) return res.status(200).json({ token: null });

    const t = result.token;
    return res.status(200).json({
      token: {
        name: t.name || null,
        symbol: t.symbol || null,
        logo: t.info?.imageLargeUrl || t.info?.imageSmallUrl || null,
        description: t.info?.description || null,
        twitter: t.socialLinks?.twitter || null,
        telegram: t.socialLinks?.telegram || null,
        discord: t.socialLinks?.discord || null,
        website: t.socialLinks?.website || null,
        priceUsd: result.priceUSD ?? null,
        marketCap: result.marketCap ?? null,
        liquidityUsd: result.liquidity ?? null,
        volume24h: result.volume24 ?? null,
        priceChange24h: result.change24 != null ? result.change24 * 100 : null,
        holders: result.holders ?? null,
      },
    });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}

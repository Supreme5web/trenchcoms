const NETWORK_IDS = {
  solana: 1399811149,
  ethereum: 1,
  bsc: 56,
  robinhood: 4663,
};

export default async function handler(req, res) {
  const { address, chain } = req.query;
  const networkId = NETWORK_IDS[chain];

  if (!address || !networkId) {
    return res
      .status(400)
      .json({ error: "Missing or unsupported address/chain" });
  }

  const apiKey = process.env.CODEX_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error:
        "CODEX_API_KEY is not set in the Vercel project's environment variables",
    });
  }

  const tokenId = `${address}:${networkId}`;
  const query = `
    query TokenHolders($tokens: [String!], $limit: Int) {
      filterTokens(input: { tokens: $tokens, limit: $limit }) {
        results { holders }
      }
    }
  `;

  try {
    const response = await fetch("https://graph.codex.io/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: apiKey },
      body: JSON.stringify({
        query,
        variables: { tokens: [tokenId], limit: 1 },
      }),
    });
    const json = await response.json();

    if (json.errors) {
      console.error("Codex error:", json.errors);
      return res
        .status(502)
        .json({ error: json.errors[0]?.message || "Codex API error" });
    }

    const holders = json.data?.filterTokens?.results?.[0]?.holders ?? null;
    return res.status(200).json({ holders });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}

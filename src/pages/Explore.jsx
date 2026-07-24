import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import Icon from "../components/Icon.jsx";

const TABS = ["Trending", "New", "Verified"];

export default function Explore() {
  const [tab, setTab] = useState("Trending");
  const [query, setQuery] = useState("");
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let request = supabase
      .from("communities")
      .select("id, name, slug, symbol, description, market_cap, verified, created_at");

    if (tab === "Trending") request = request.order("market_cap", { ascending: false, nullsFirst: false });
    if (tab === "New") request = request.order("created_at", { ascending: false });
    if (tab === "Verified")
      request = request.eq("verified", true).order("market_cap", { ascending: false, nullsFirst: false });

    setLoading(true);
    request.limit(30).then(({ data, error }) => {
      if (!error) setCommunities(data || []);
      setLoading(false);
    });
  }, [tab]);

  const filtered = communities.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || (c.symbol || "").toLowerCase().includes(q);
  });

  return (
    <div className="pageStack">
      <div className="pageHeader">
        <span className="eyebrow">Explore</span>
        <h1>Find your trench</h1>
      </div>

      <div className="searchPanel glassPanel">
        <input placeholder="Search by name or symbol" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="segmented">
          {TABS.map((t) => (
            <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="cardGrid">
        {filtered.map((c) => (
          <div
            className="communityCard glassPanel"
            key={c.id}
            onClick={() => navigate(`/app/community/${c.slug}`)}
            style={{ cursor: "pointer" }}
          >
            <div className="cardTitle">
              {c.name} {c.verified && <span className="verified"><Icon name="check" /></span>}
            </div>
            <span className="symbol">{c.symbol ? `$${c.symbol}` : ""}</span>
            <p>{c.description}</p>
            <div className="metricRow">
              <span>Market cap</span>
              <strong>{c.market_cap ? `$${Number(c.market_cap).toLocaleString()}` : "—"}</strong>
            </div>
          </div>
        ))}
        {!loading && filtered.length === 0 && <p className="muted">No communities match.</p>}
      </div>
    </div>
  );
}

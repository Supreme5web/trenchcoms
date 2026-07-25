import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import { fetchTokenInfo, CHAIN_OPTIONS } from "../lib/dexscreener.js";
import { uploadImage } from "../lib/storage.js";

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
}

export default function CreateCommunity() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    symbol: "",
    description: "",
    chain: "solana",
    contract_address: "",
    website: "",
    twitter: "",
    telegram: "",
    discord: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState("");

  const handleBannerChange = (e) => {
    const file = e.target.files?.[0] || null;
    setBannerFile(file);
    setBannerPreview(file ? URL.createObjectURL(file) : "");
  };

  // Result of the DexScreener lookup for the current contract_address.
  // Kept separate from `form` since the user should still be able to
  // override name/symbol even after an auto-fill.
  const [lookup, setLookup] = useState({ status: "idle", data: null });
  const nameTouchedRef = useRef(false);
  const symbolTouchedRef = useRef(false);

  const update = (key) => (e) => {
    if (key === "name") nameTouchedRef.current = true;
    if (key === "symbol") symbolTouchedRef.current = true;
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  // Debounced contract-address lookup: waits for the user to stop typing,
  // then asks DexScreener for the token's name/symbol/logo/market cap.
  useEffect(() => {
    const address = form.contract_address.trim();
    if (!address) {
      setLookup({ status: "idle", data: null });
      return;
    }
    setLookup({ status: "loading", data: null });
    const timer = setTimeout(async () => {
      try {
        const info = await fetchTokenInfo(address, form.chain);
        if (!info) {
          setLookup({ status: "not-found", data: null });
          return;
        }
        setLookup({ status: "found", data: info });
        setForm((f) => ({
          ...f,
          name: !nameTouchedRef.current && info.name ? info.name : f.name,
          symbol: !symbolTouchedRef.current && info.symbol ? info.symbol : f.symbol,
        }));
      } catch (err) {
        setLookup({ status: "error", data: null });
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [form.contract_address, form.chain]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.description.trim()) {
      setError("Name and description are required.");
      return;
    }
    setSubmitting(true);
    setError("");

    let bannerUrl = null;
    if (bannerFile) {
      try {
        bannerUrl = await uploadImage(bannerFile, "banners", user.id);
      } catch (uploadError) {
        setError(`Banner upload failed: ${uploadError.message}`);
        setSubmitting(false);
        return;
      }
    }

    const slug = `${slugify(form.name)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data, error: insertError } = await supabase
      .from("communities")
      .insert({
        owner_id: user.id,
        name: form.name.trim(),
        slug,
        symbol: form.symbol.trim() || null,
        description: form.description.trim(),
        chain: form.chain,
        contract_address: form.contract_address.trim() || null,
        website: form.website.trim() || null,
        twitter: form.twitter.trim() || null,
        telegram: form.telegram.trim() || null,
        discord: form.discord.trim() || null,
        logo: lookup.data?.logo || null,
        banner: bannerUrl,
        market_cap: lookup.data?.marketCap || null,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    await supabase.from("community_members").insert({
      community_id: data.id,
      profile_id: user.id,
      role: "owner",
    });

    setSubmitting(false);
    navigate(`/app/community/${data.slug}`);
  };

  return (
    <div className="pageStack">
      <div className="pageHeader">
        <span className="eyebrow">Create</span>
        <h1>Start a community</h1>
      </div>

      <form className="createForm glassPanel" onSubmit={handleSubmit}>
        <div className="formGrid">
          <label>
            Name
            <input value={form.name} onChange={update("name")} placeholder="Project or community name" required />
          </label>
          <label>
            Symbol
            <input value={form.symbol} onChange={update("symbol")} placeholder="Token symbol" />
          </label>
          <label>
            Chain
            <select value={form.chain} onChange={update("chain")}>
              {CHAIN_OPTIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="wideField">
            Description
            <textarea
              value={form.description}
              onChange={update("description")}
              placeholder="What's this community about?"
              required
            />
          </label>
          <label className="wideField">
            Contract address
            <input value={form.contract_address} onChange={update("contract_address")} placeholder="Paste the token's contract address" />
          </label>
          <label>
            Website
            <input value={form.website} onChange={update("website")} placeholder="https://" />
          </label>
          <label>
            Twitter / X
            <input value={form.twitter} onChange={update("twitter")} placeholder="https://x.com/..." />
          </label>
          <label>
            Telegram
            <input value={form.telegram} onChange={update("telegram")} placeholder="https://t.me/..." />
          </label>
          <label>
            Discord
            <input value={form.discord} onChange={update("discord")} placeholder="https://discord.gg/..." />
          </label>
          <label className="wideField">
            Banner image
            <div className="bannerUpload" style={bannerPreview ? { backgroundImage: `url(${bannerPreview})` } : undefined}>
              {!bannerPreview && <span className="muted">Recommended 1500×500 — shown at the top of your community page</span>}
              <input type="file" accept="image/*" onChange={handleBannerChange} />
            </div>
          </label>
        </div>

        {lookup.status === "idle" && (
          <p className="inlineNotice">Contract address can be added later. Leave it blank and create the community now.</p>
        )}
        {lookup.status === "loading" && <p className="inlineNotice">Looking up token info on DexScreener...</p>}
        {lookup.status === "not-found" && (
          <p className="inlineNotice">No DexScreener data found for that address yet — you can still create the community and fill this in later.</p>
        )}
        {lookup.status === "error" && (
          <p className="inlineNotice">Couldn't reach DexScreener — you can still create the community and fill this in later.</p>
        )}
        {lookup.status === "found" && lookup.data && (
          <div className="tokenPreview">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {lookup.data.logo ? (
                <img src={lookup.data.logo} alt="" style={{ width: 40, height: 40, borderRadius: 8 }} />
              ) : (
                <div className="avatar">{(lookup.data.symbol || "?").slice(0, 1)}</div>
              )}
              <div>
                <strong>{lookup.data.name || form.name}</strong>
                <br />
                <span className="symbol">{lookup.data.symbol ? `$${lookup.data.symbol}` : ""}</span>
              </div>
            </div>
            <div>
              <span className="muted">Market cap</span>
              <br />
              <strong>{lookup.data.marketCap ? `$${Number(lookup.data.marketCap).toLocaleString()}` : "—"}</strong>
            </div>
          </div>
        )}

        {error && <p className="inlineNotice">{error}</p>}

        <div className="createActions">
          <button className="button primary" type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create community"}
          </button>
        </div>
      </form>
    </div>
  );
}

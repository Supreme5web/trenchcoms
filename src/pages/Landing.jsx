import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { isSupabaseConfigured, supabase } from "../lib/supabase.js";
import Icon, { GoogleIcon, XIcon } from "../components/Icon.jsx";

const FEATURES = [
  {
    icon: "spark",
    title: "Verified token rooms",
    body: "Every community is tied to a contract address, so holders always know they're in the real room — not a copycat.",
  },
  {
    icon: "pin",
    title: "Official updates, pinned",
    body: "Owners and moderators post announcements that stay pinned above the noise of general chat.",
  },
  {
    icon: "link",
    title: "Live on-chain context",
    body: "Market cap and price context sit next to the conversation, pulled straight from the chain — no tab switching.",
  },
];

export default function Landing() {
  const { user, signInWithGoogle, signInWithTwitter, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ communities: null });
  const [featured, setFeatured] = useState([]);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (!loading && user) navigate("/app", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .from("communities")
      .select("id", { count: "exact", head: true })
      .then(({ count, error }) => {
        if (!error) setStats({ communities: count });
      });
    supabase
      .from("communities")
      .select("id, name, slug, symbol, description, market_cap, verified, logo")
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data, error }) => {
        if (!error) setFeatured(data || []);
      });
  }, []);

  const handleGoogle = async () => {
    setAuthError("");
    const { error } = await signInWithGoogle();
    if (error) setAuthError(error.message);
  };

  const handleTwitter = async () => {
    setAuthError("");
    const { error } = await signInWithTwitter();
    if (error) setAuthError(error.message);
  };

  return (
    <div className="landingPage">
      <header className="landingHeader">
        <a className="landingBrand" href="#top">
          <span className="wordmark">
            <span className="wordmarkTrench">Trench</span>
            <span className="wordmarkComs">Coms</span>
          </span>
        </a>
        <div className="authGroup">
          <button className="authButton" onClick={handleGoogle}>
            <GoogleIcon />
            <span>Google</span>
          </button>
          <button className="authButton primary" onClick={handleTwitter}>
            <XIcon />
            <span>Continue with X</span>
          </button>
        </div>
      </header>

      <main id="top">
        <section className="landingHero">
          <div>
            <span className="eyebrow">
              <Icon name="spark" />
              Token-native community platform
            </span>
            <h1>
              The home for <span>crypto communities.</span>
            </h1>
            <p>
              A verified place for token teams to publish updates, organize holders, and keep
              community activity connected to on-chain context.
            </p>

            <div className="heroActions">
              <button className="authButton primary" onClick={handleGoogle}>
                <GoogleIcon />
                Sign in with Google
              </button>
              <button className="authButton" onClick={handleTwitter}>
                <XIcon />
                Sign in with X
              </button>
            </div>

            {authError && <p className="inlineNotice">{authError}</p>}
          </div>

          <div className="heroVisual">
            <div className="heroVisualTicker">
              <span>Trench signal</span>
              <span className="pulse" />
            </div>
            <div className="heroVisualStat">
              <span>Communities live</span>
              <strong className="accentText">
                {stats.communities === null ? "—" : stats.communities.toLocaleString()}
              </strong>
            </div>
            <div className="heroVisualStat">
              <span>Built for</span>
              <strong>Token teams &amp; holders</strong>
            </div>
            <div className="heroVisualStat">
              <span>Rooted in</span>
              <strong>On-chain identity</strong>
            </div>
          </div>
        </section>

        <section className="sectionBand" id="why">
          <div className="sectionTitle">
            <span className="eyebrow">Why TrenchComs</span>
            <h2>Built for the trenches, not another generic feed.</h2>
          </div>
          <div className="featureGrid">
            {FEATURES.map((f, i) => (
              <div className="featureCard" key={f.title}>
                <span className="featureIndex">0{i + 1}</span>
                <Icon name={f.icon} />
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {featured.length > 0 && (
          <section className="sectionBand" id="communities">
            <div className="sectionTitle">
              <span className="eyebrow">Directory</span>
              <h2>Public communities</h2>
            </div>
            <div className="cardGrid">
              {featured.map((c) => (
                <div className="communityCard glassPanel" key={c.id}>
                  <div className="cardTitle">
                    <div className="avatar" style={{ width: 28, height: 28, fontSize: 13 }}>
                      {c.logo ? <img src={c.logo} alt="" /> : c.name.slice(0, 1).toUpperCase()}
                    </div>
                    {c.name}
                    {c.verified && (
                      <span className="verified">
                        <Icon name="check" />
                      </span>
                    )}
                  </div>
                  <span className="symbol">{c.symbol ? `$${c.symbol}` : ""}</span>
                  <p>{c.description}</p>
                  <div className="metricRow">
                    <span>Market cap</span>
                    <strong>{c.market_cap ? `$${Number(c.market_cap).toLocaleString()}` : "Not listed"}</strong>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="landingFooter">
        <span>© 2026 TrenchComs</span>
        <span>Built for token teams</span>
      </footer>
    </div>
  );
}

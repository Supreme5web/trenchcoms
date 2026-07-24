import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { isSupabaseConfigured, supabase } from "../lib/supabase.js";
import Icon, { GoogleIcon, XIcon } from "../components/Icon.jsx";

export default function Landing() {
  const { user, signInWithGoogle, signInWithTwitter, loading } = useAuth();
  const navigate = useNavigate();
  const [featured, setFeatured] = useState([]);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (!loading && user) navigate("/app", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .from("communities")
      .select("id, name, slug, symbol, description, market_cap, verified")
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
          <span className="brandMark">TC</span>
          TrenchComs
        </a>
        <div className="authGroup">
          <button className="authButton" onClick={handleGoogle}>
            <GoogleIcon />
            Google
          </button>
          <button className="authButton primary" onClick={handleTwitter}>
            <XIcon />
            Continue with X
          </button>
        </div>
      </header>

      <main id="top">
        <section className="landingHero">
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

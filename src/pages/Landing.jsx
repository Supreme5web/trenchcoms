import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { isSupabaseConfigured, supabase } from "../lib/supabase.js";

const ICONS = {
  arrowRight: "M5 12h14M13 5l7 7-7 7",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M13.73 21a2 2 0 0 1-3.46 0",
  bookmark: "M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z",
  check: "M20 6 9 17l-5-5",
  home: "M3 11l9-8 9 8M5 10v10h14V10",
  image: "M21 15V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10M3 15l4-4a2 2 0 0 1 3 0l5 5M14 14l1-1a2 2 0 0 1 3 0l3 3M14 8h.01",
  link: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  lock: "M7 11V8a5 5 0 0 1 10 0v3M6 11h12v10H6z",
  megaphone: "M3 11v2a2 2 0 0 0 2 2h2l4 4v-4l8 3V6l-8 3H5a2 2 0 0 0-2 2z",
  message: "M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z",
  search: "M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8.92 3.4a1.65 1.65 0 0 0 1-1.51V1.8a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 8c.36.61.97 1 1.69 1H21a2 2 0 1 1 0 4h-.09c-.72 0-1.33.39-1.51 1z",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  spark: "M13 2 3 14h8l-1 8 11-13h-8z",
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
};

function Icon({ name, className = "" }) {
  return (
    <svg className={`uiIcon ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="brandProviderIcon" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.24 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.17v2.85A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.04H2.17a11 11 0 0 0 0 9.92l3.67-2.85z" />
      <path fill="#EA4335" d="M12 5.36c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.56 10.56 0 0 0 12 1 11 11 0 0 0 2.17 7.04l3.67 2.85C6.71 7.29 9.14 5.36 12 5.36z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="brandProviderIcon monoIcon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18.9 2h3.3l-7.2 8.24L23.5 22h-6.65l-5.2-6.8L5.7 22H2.4l7.7-8.8L1.95 2H8.8l4.7 6.21L18.9 2zm-1.16 17.93h1.83L7.8 3.96H5.84l11.9 15.97z" />
    </svg>
  );
}

const NAV_ITEMS = ["About", "How it Works", "Docs", "Roadmap"];
const SIDE_ITEMS = [
  ["home", "Home"],
  ["users", "My Communities"],
  ["megaphone", "Announcements"],
  ["message", "Members"],
  ["bookmark", "Bookmarks"],
  ["settings", "Settings"],
];

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
    <div className="landingPage landingNebula">
      <header className="landingNav">
        <a className="landingBrand" href="#top" aria-label="TrenchComs home">
          <span className="landingMark">TC</span>
          <span>
            Trench<span>Coms</span>
          </span>
        </a>

        <nav aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => (
            <a href={`#${item.toLowerCase().replaceAll(" ", "-")}`} key={item}>
              {item}
            </a>
          ))}
        </nav>

        <div className="landingNavActions">
          <button className="landingAuth compact" onClick={handleGoogle}>
            <GoogleIcon />
            Sign in with Google
          </button>
          <button className="landingAuth compact xAuth" onClick={handleTwitter}>
            <XIcon />
            Sign in with X
          </button>
        </div>
      </header>

      <main id="top">
        <section className="landingHero">
          <div className="landingHeroCopy">
            <span className="landingEyebrow">Token-native community platform</span>
            <h1>
              The Home for <span>Crypto Communities.</span>
            </h1>
            <p>
              TrenchComs gives token teams a verified place to publish updates, organize
              holders, and keep community activity connected to on-chain context.
            </p>

            <div className="landingCtas">
              <button className="landingAuth primary" onClick={handleGoogle}>
                <GoogleIcon />
                Sign in with Google
                <Icon name="arrowRight" className="arrowIcon" />
              </button>
              <button className="landingAuth secondary" onClick={handleTwitter}>
                <XIcon />
                Sign in with X
                <Icon name="arrowRight" className="arrowIcon" />
              </button>
            </div>

            {authError && <p className="inlineNotice landingNotice">{authError}</p>}

            <div className="trustStrip" aria-label="Platform promises">
              <div className="trustIconGroup" aria-hidden="true">
                <span><Icon name="users" /></span>
                <span><Icon name="message" /></span>
                <span><Icon name="megaphone" /></span>
              </div>
              <p>
                Built for token teams.
                <br />
                Ready for real communities.
              </p>
              <div className="trustDivider" />
              <div className="shieldMini" aria-hidden="true">
                <Icon name="shield" />
              </div>
              <p>
                Verified spaces.
                <br />
                Powered by real project data.
              </p>
            </div>
          </div>

          <div className="productMock" aria-label="TrenchComs product preview">
            <div className="mockTop">
              <div className="mockBrand">
                <span>TC</span>
                Trench<span>Coms</span>
              </div>
              <div className="mockSearch">
                <Icon name="search" />
                <span>Search communities...</span>
              </div>
              <button className="mockIconButton" aria-label="Notifications">
                <Icon name="bell" />
              </button>
              <div className="mockProfileDot" aria-label="Profile" />
            </div>

            <div className="mockBody">
              <aside className="mockSide">
                {SIDE_ITEMS.map(([icon, item], index) => (
                  <div className={index === 0 ? "mockSideItem active" : "mockSideItem"} key={item}>
                    <Icon name={icon} />
                    {item}
                  </div>
                ))}
              </aside>

              <div className="mockFeed">
                <div className="mockWelcome">
                  <h2>Community dashboard</h2>
                  <p>Publish official updates and keep member conversations organized.</p>
                </div>

                <div className="mockComposer">
                  <div className="mockProfileDot" aria-hidden="true" />
                  <span>Write an official update for your community...</span>
                  <button>Post</button>
                </div>

                <div className="mockActivityPanel" aria-hidden="true">
                  <div />
                  <div />
                  <div />
                </div>
              </div>
            </div>
          </div>
        </section>

        {featured.length > 0 && (
          <section className="sectionBand liveDirectory" id="communities">
            <div className="sectionHeader">
              <div className="sectionTitle">
                <span className="landingEyebrow">Directory</span>
                <h2>Public communities</h2>
              </div>
            </div>
            <div className="cardGrid">
              {featured.map((c) => (
                <div className="communityCard glassPanel" key={c.id}>
                  <div className="cardTitle">
                    {c.name} {c.verified && <span className="verified"><Icon name="check" /> Verified</span>}
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

        <section className="landingInfo" id="about">
          <div>
            <span className="landingEyebrow">Public community layer</span>
            <h2>Built for teams, holders, and investors.</h2>
            <p>
              TrenchComs brings official announcements, member conversations, and token context
              into one focused community experience.
            </p>
          </div>
          <div className="launchPanel">
            <strong>Platform focus</strong>
            <span>Verified team spaces</span>
            <span>Community discussions</span>
            <span>Token-aware profiles</span>
            <span>Announcements and updates</span>
          </div>
        </section>
      </main>
    </div>
  );
}

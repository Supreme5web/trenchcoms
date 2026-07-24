import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";

const NAV_ITEMS = [
  { to: "/app", label: "Home", icon: "H", end: true },
  { to: "/app/explore", label: "Explore", icon: "E" },
  { to: "/app/create", label: "Create", icon: "+" },
  { to: "/app/notifications", label: "Alerts", icon: "N" },
  { to: "/app/profile", label: "Profile", icon: "P" },
  { to: "/app/settings", label: "Settings", icon: "S" },
];

export default function AppShell() {
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [trending, setTrending] = useState([]);

  useEffect(() => {
    if (!loading && !user) navigate("/", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    let active = true;
    supabase
      .from("communities")
      .select("id, name, slug, symbol, market_cap")
      .order("market_cap", { ascending: false, nullsFirst: false })
      .limit(5)
      .then(({ data, error }) => {
        if (active && !error) setTrending(data || []);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading || !user) {
    return <div style={{ padding: 40, textAlign: "center" }}>Loading TrenchComs...</div>;
  }

  return (
    <div className="appFrame">
      <aside className="leftRail glassPanel">
        <div className="brand">
          <span className="brandMark">TC</span>
          <span className="brandText">TrenchComs</span>
        </div>
        <nav className="sideNav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `navItem${isActive ? " active" : ""}`}
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button className="button ghost wide" onClick={() => signOut()}>
          Sign out
        </button>
      </aside>

      <main className="centerStage">
        <Outlet />
      </main>

      <aside className="rightRail">
        <div className="railSection glassPanel">
          <div className="sectionHeader">
            <h3>Signed in as</h3>
          </div>
          <div className="miniCommunity">
            <div className="avatar">{(profile?.display_name || "?").slice(0, 1).toUpperCase()}</div>
            <div>
              <strong>{profile?.display_name}</strong>
              <small>@{profile?.username}</small>
            </div>
          </div>
        </div>

        <div className="railSection glassPanel">
          <div className="sectionHeader">
            <h3>Trending communities</h3>
          </div>
          {trending.map((c) => (
            <div
              className="miniCommunity"
              key={c.id}
              onClick={() => navigate(`/app/community/${c.slug}`)}
              style={{ cursor: "pointer" }}
            >
              <div className="avatar">{c.name.slice(0, 1).toUpperCase()}</div>
              <div>
                <strong>{c.name}</strong>
                <small>{c.symbol ? `$${c.symbol}` : "—"}</small>
              </div>
            </div>
          ))}
          {trending.length === 0 && <p className="muted">No communities yet.</p>}
        </div>
      </aside>
    </div>
  );
}
